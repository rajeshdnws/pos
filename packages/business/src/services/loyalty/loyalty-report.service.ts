import { Prisma, PrismaClient } from '@prisma/client';
import {
  LoyaltyKPIsDTO,
  LoyaltyReportFilterDTO,
  PaginatedResult,
} from '@rs-inventory/types';
import { SalesCalculationService } from '../sales-calculation.service.js';
import { LoyaltySettingsService } from './loyalty-settings.service.js';

export class LoyaltyReportService {
  private settingsService: LoyaltySettingsService;

  constructor(private readonly prisma: PrismaClient) {
    this.settingsService = new LoyaltySettingsService(prisma);
  }

  /**
   * Aggregates loyalty KPIs including outstanding rupee liability.
   */
  public async getLoyaltyKPIs(companyId: string): Promise<LoyaltyKPIsDTO> {
    const settings = await this.settingsService.getSettings(companyId);

    const [walletAgg, count] = await Promise.all([
      this.prisma.customerWallet.aggregate({
        where: { companyId },
        _sum: {
          cachedAvailablePoints: true,
          cachedLifetimeEarned: true,
          cachedLifetimeRedeemed: true,
          cachedLifetimeExpired: true,
        },
      }),
      this.prisma.customerWallet.count({ where: { companyId } }),
    ]);

    const totalActivePoints = Math.max(0, walletAgg._sum.cachedAvailablePoints || 0);
    const lifetimeEarned = walletAgg._sum.cachedLifetimeEarned || 0;
    const lifetimeRedeemed = walletAgg._sum.cachedLifetimeRedeemed || 0;
    const lifetimeExpired = walletAgg._sum.cachedLifetimeExpired || 0;

    const estimatedLiabilityAmount = SalesCalculationService.round(
      totalActivePoints * settings.redemptionValue,
      2,
    );

    const redemptionRate = lifetimeEarned > 0
      ? SalesCalculationService.round((lifetimeRedeemed / lifetimeEarned) * 100, 2)
      : 0;

    return {
      totalEnrolledCustomers: count,
      totalActivePoints,
      estimatedLiabilityAmount,
      lifetimePointsEarned: lifetimeEarned,
      lifetimePointsRedeemed: lifetimeRedeemed,
      lifetimePointsExpired: lifetimeExpired,
      redemptionRate,
    };
  }

  /**
   * Generates a detailed audit and reporting ledger for loyalty operations.
   */
  public async getLoyaltyReport(
    companyId: string,
    filters: LoyaltyReportFilterDTO = {},
  ): Promise<PaginatedResult<any>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: Prisma.LoyaltyTransactionWhereInput = { companyId };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.transactionType && filters.transactionType !== 'ALL') {
      where.transactionType = filters.transactionType;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, customerCode: true, phone: true },
          },
          salesInvoice: {
            select: { id: true, invoiceNumber: true, grandTotal: true },
          },
        },
      }),
      this.prisma.loyaltyTransaction.count({ where }),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        customerId: t.customerId,
        customerName: t.customer?.name || 'Unknown',
        customerCode: t.customer?.customerCode || '',
        customerPhone: t.customer?.phone || '',
        transactionType: t.transactionType,
        points: t.points,
        balanceAfter: t.balanceAfter,
        referenceType: t.referenceType,
        invoiceNumber: t.invoiceNumberSnapshot || t.salesInvoice?.invoiceNumber || '-',
        description: t.description,
        reason: t.reason,
        createdBy: t.createdBy,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Leaderboard of top loyalty point holders.
   */
  public async getTopCustomers(companyId: string, limit: number = 10): Promise<any[]> {
    const topWallets = await this.prisma.customerWallet.findMany({
      where: { companyId, cachedAvailablePoints: { gt: 0 } },
      orderBy: { cachedAvailablePoints: 'desc' },
      take: limit,
      include: {
        customer: {
          select: { id: true, name: true, customerCode: true, phone: true, email: true },
        },
      },
    });

    return topWallets.map((w) => ({
      customerId: w.customerId,
      name: w.customer?.name || 'Unknown',
      customerCode: w.customer?.customerCode || '',
      phone: w.customer?.phone || '',
      email: w.customer?.email || '',
      availablePoints: w.cachedAvailablePoints,
      lifetimeEarned: w.cachedLifetimeEarned,
      lifetimeRedeemed: w.cachedLifetimeRedeemed,
    }));
  }
}
