import { Prisma, PrismaClient } from '@prisma/client';
import {
  CustomerWalletDTO,
  LoyaltyTransactionDTO,
  LoyaltyTransactionFilterDTO,
  ManualPointsAdjustmentDTO,
  PaginatedResult,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../errors/app.error.js';
import { AuditService } from '../audit.service.js';
import { LoyaltySettingsService } from './loyalty-settings.service.js';

export class LoyaltyWalletService {
  private auditService: AuditService;
  private settingsService: LoyaltySettingsService;

  constructor(private readonly prisma: PrismaClient) {
    this.auditService = new AuditService(prisma);
    this.settingsService = new LoyaltySettingsService(prisma);
  }

  /**
   * Retrieves or initializes a customer wallet.
   */
  public async getOrCreateWallet(
    companyId: string,
    customerId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CustomerWalletDTO> {
    const client = tx || this.prisma;

    const existing = await client.customerWallet.findUnique({
      where: { customerId },
      include: { customer: true },
    });

    if (existing) {
      if (existing.companyId !== companyId) {
        throw new BusinessRuleError('Customer belongs to another company.');
      }
      return this.mapWalletToDTO(existing);
    }

    // Verify customer exists
    const customer = await client.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer || customer.companyId !== companyId) {
      throw new NotFoundError('Customer not found for this company.');
    }

    const created = await client.customerWallet.create({
      data: {
        companyId,
        customerId,
        cachedAvailablePoints: 0,
        cachedLifetimeEarned: 0,
        cachedLifetimeRedeemed: 0,
        cachedLifetimeExpired: 0,
        cachedLifetimeReversed: 0,
        status: 'ACTIVE',
      },
      include: { customer: true },
    });

    return this.mapWalletToDTO(created);
  }

  /**
   * Retrieves full wallet details by customer ID.
   */
  public async getWallet(companyId: string, customerId: string): Promise<CustomerWalletDTO | null> {
    const wallet = await this.prisma.customerWallet.findUnique({
      where: { customerId },
      include: { customer: true },
    });
    if (!wallet || wallet.companyId !== companyId) return null;
    return this.mapWalletToDTO(wallet);
  }

  /**
   * Lists loyalty ledger transactions with pagination and filters.
   */
  public async listTransactions(
    companyId: string,
    filters: LoyaltyTransactionFilterDTO = {},
  ): Promise<PaginatedResult<LoyaltyTransactionDTO>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.LoyaltyTransactionWhereInput = { companyId };
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters.transactionType && filters.transactionType !== 'ALL') {
      where.transactionType = filters.transactionType;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { invoiceNumberSnapshot: { contains: q } },
        { description: { contains: q } },
        { reason: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, customerCode: true, phone: true } },
          salesInvoice: { select: { id: true, invoiceNumber: true } },
        },
      }),
      this.prisma.loyaltyTransaction.count({ where }),
    ]);

    return {
      items: items.map((t) => this.mapTransactionToDTO(t)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Reconciles cached wallet balance against authoritative ledger sum.
   */
  public async reconcileWallet(
    companyId: string,
    customerId: string,
  ): Promise<{ reconciled: boolean; oldBalance: number; newBalance: number }> {
    const wallet = await this.getOrCreateWallet(companyId, customerId);

    // Sum all ledger entries
    const ledgerSum = await this.prisma.loyaltyTransaction.aggregate({
      where: { companyId, customerId },
      _sum: { points: true },
    });

    const trueBalance = Math.round((ledgerSum._sum.points || 0) * 100) / 100;
    const oldBalance = wallet.cachedAvailablePoints;

    if (trueBalance !== oldBalance) {
      await this.prisma.customerWallet.update({
        where: { id: wallet.id },
        data: { cachedAvailablePoints: trueBalance },
      });

      await this.auditService.log({
        companyId,
        module: 'LOYALTY',
        action: 'WALLET_RECONCILED',
        referenceId: wallet.id,
        oldValue: { cachedAvailablePoints: oldBalance },
        newValue: { cachedAvailablePoints: trueBalance },
      });

      return { reconciled: true, oldBalance, newBalance: trueBalance };
    }

    return { reconciled: false, oldBalance, newBalance: trueBalance };
  }

  /**
   * Performs an administrative manual points adjustment (credit or debit).
   */
  public async manualAdjustment(
    companyId: string,
    dto: ManualPointsAdjustmentDTO,
    userId?: string,
  ): Promise<LoyaltyTransactionDTO> {
    if (!dto.customerId) throw new ValidationError('Customer ID is required.');
    if (!dto.points || dto.points <= 0) {
      throw new ValidationError('Adjustment points must be a positive number.');
    }
    if (!dto.reason || !dto.reason.trim()) {
      throw new ValidationError('A mandatory reason is required for manual points adjustment.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await this.getOrCreateWallet(companyId, dto.customerId, tx);
      const settings = await this.settingsService.getSettings(companyId, tx);

      const isCredit = dto.adjustmentType === 'CREDIT';
      const pointsDelta = isCredit ? dto.points : -dto.points;
      const newBalance = wallet.cachedAvailablePoints + pointsDelta;

      if (!isCredit && newBalance < 0 && settings.negativeBalancePolicy !== 'ALLOW_NEGATIVE') {
        throw new BusinessRuleError(
          `Insufficient points for debit. Available: ${wallet.cachedAvailablePoints}, Requested debit: ${dto.points}.`,
        );
      }

      // Create transaction
      const txn = await tx.loyaltyTransaction.create({
        data: {
          companyId,
          customerId: dto.customerId,
          walletId: wallet.id,
          transactionType: isCredit ? 'MANUAL_CREDIT' : 'MANUAL_DEBIT',
          points: pointsDelta,
          balanceAfter: newBalance,
          referenceType: 'MANUAL',
          description: `Manual ${dto.adjustmentType}: ${dto.reason.trim()}`,
          reason: dto.reason.trim(),
          createdBy: userId || null,
        },
        include: {
          customer: { select: { id: true, name: true, customerCode: true, phone: true } },
        },
      });

      // If credit and expiry is configured, create a lot
      if (isCredit && settings.pointExpiryDays > 0) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + settings.pointExpiryDays);

        await tx.loyaltyPointLot.create({
          data: {
            companyId,
            customerId: dto.customerId,
            walletId: wallet.id,
            sourceTransactionId: txn.id,
            originalPoints: dto.points,
            remainingPoints: dto.points,
            expiresAt,
            status: 'ACTIVE',
          },
        });
      }

      // Update cached wallet balance
      await tx.customerWallet.update({
        where: { id: wallet.id },
        data: {
          cachedAvailablePoints: newBalance,
          ...(isCredit
            ? { cachedLifetimeEarned: { increment: dto.points } }
            : {}),
        },
      });

      return { txn, pointsDelta, newBalance };
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      module: 'LOYALTY',
      action: `LOYALTY_${result.txn.transactionType}`,
      referenceId: result.txn.id,
      newValue: { points: result.pointsDelta, balanceAfter: result.newBalance, reason: dto.reason },
    });

    return this.mapTransactionToDTO(result.txn);
  }

  private mapWalletToDTO(w: any): CustomerWalletDTO {
    return {
      id: w.id,
      companyId: w.companyId,
      customerId: w.customerId,
      cachedAvailablePoints: w.cachedAvailablePoints,
      cachedLifetimeEarned: w.cachedLifetimeEarned,
      cachedLifetimeRedeemed: w.cachedLifetimeRedeemed,
      cachedLifetimeExpired: w.cachedLifetimeExpired,
      cachedLifetimeReversed: w.cachedLifetimeReversed,
      status: w.status,
      customer: w.customer || null,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    };
  }

  private mapTransactionToDTO(t: any): LoyaltyTransactionDTO {
    return {
      id: t.id,
      companyId: t.companyId,
      customerId: t.customerId,
      walletId: t.walletId,
      transactionType: t.transactionType as any,
      points: t.points,
      balanceAfter: t.balanceAfter,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      salesInvoiceId: t.salesInvoiceId,
      salesReturnId: t.salesReturnId,
      invoiceNumberSnapshot: t.invoiceNumberSnapshot,
      description: t.description,
      reason: t.reason,
      idempotencyKey: t.idempotencyKey,
      reversalOfTransactionId: t.reversalOfTransactionId,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      customer: t.customer || null,
      salesInvoice: t.salesInvoice || null,
    };
  }
}
