import { PrismaClient } from '@prisma/client';
import { LoyaltyPointLotDTO } from '@rs-inventory/types';
import { AuditService } from '../audit.service.js';

export class LoyaltyExpiryService {
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.auditService = new AuditService(prisma);
  }

  /**
   * Processes points expiry locally and offline based on active point lots.
   */
  public async processExpiry(
    companyId: string,
    asOfDate: Date = new Date(),
  ): Promise<{ lotsExpired: number; pointsExpired: number }> {
    const expiredLots = await this.prisma.loyaltyPointLot.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        remainingPoints: { gt: 0 },
        expiresAt: { lte: asOfDate },
      },
      include: { wallet: true },
    });

    if (expiredLots.length === 0) {
      return { lotsExpired: 0, pointsExpired: 0 };
    }

    // Group by customer
    const customerLotMap = new Map<string, typeof expiredLots>();
    for (const lot of expiredLots) {
      const existing = customerLotMap.get(lot.customerId) || [];
      existing.push(lot);
      customerLotMap.set(lot.customerId, existing);
    }

    let totalPointsExpired = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const [customerId, lots] of customerLotMap.entries()) {
        const customerPointsExpired = lots.reduce((sum, l) => sum + l.remainingPoints, 0);
        totalPointsExpired += customerPointsExpired;

        const wallet = await tx.customerWallet.findUnique({
          where: { customerId },
        });
        if (!wallet) continue;

        // Mark lots expired
        const lotIds = lots.map((l) => l.id);
        await tx.loyaltyPointLot.updateMany({
          where: { id: { in: lotIds } },
          data: { status: 'EXPIRED', remainingPoints: 0 },
        });

        const newBalance = Math.max(0, wallet.cachedAvailablePoints - customerPointsExpired);

        // Record EXPIRE transaction
        await tx.loyaltyTransaction.create({
          data: {
            companyId,
            customerId,
            walletId: wallet.id,
            transactionType: 'EXPIRE',
            points: -customerPointsExpired,
            balanceAfter: newBalance,
            referenceType: 'EXPIRY_BATCH',
            description: `Expired ${customerPointsExpired} points across ${lots.length} point lot(s)`,
          },
        });

        // Update cached wallet balance
        await tx.customerWallet.update({
          where: { id: wallet.id },
          data: {
            cachedAvailablePoints: newBalance,
            cachedLifetimeExpired: { increment: customerPointsExpired },
          },
        });
      }
    });

    await this.auditService.log({
      companyId,
      module: 'LOYALTY',
      action: 'LOYALTY_EXPIRY_RUN',
      newValue: { lotsExpired: expiredLots.length, pointsExpired: totalPointsExpired },
    });

    return {
      lotsExpired: expiredLots.length,
      pointsExpired: totalPointsExpired,
    };
  }

  /**
   * Retrieves lots nearing expiration for a customer within the given day threshold.
   */
  public async getExpiringLots(
    companyId: string,
    customerId: string,
    daysAhead: number = 30,
  ): Promise<LoyaltyPointLotDTO[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    const lots = await this.prisma.loyaltyPointLot.findMany({
      where: {
        companyId,
        customerId,
        status: 'ACTIVE',
        remainingPoints: { gt: 0 },
        expiresAt: {
          gt: now,
          lte: future,
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    return lots.map((l) => ({
      id: l.id,
      companyId: l.companyId,
      customerId: l.customerId,
      walletId: l.walletId,
      sourceTransactionId: l.sourceTransactionId,
      originalPoints: l.originalPoints,
      remainingPoints: l.remainingPoints,
      earnedAt: l.earnedAt,
      expiresAt: l.expiresAt,
      status: l.status as any,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));
  }
}
