import { Prisma, PrismaClient } from '@prisma/client';
import { SalesCalculationService } from '../sales-calculation.service.js';
import { LoyaltySettingsService } from './loyalty-settings.service.js';

export interface ReturnLoyaltyResult {
  pointsReversed: number;
  pointsRestored: number;
  refundDeductionOffset: number;
}

export class LoyaltyReturnService {
  private settingsService: LoyaltySettingsService;

  constructor(private readonly prisma: PrismaClient) {
    this.settingsService = new LoyaltySettingsService(prisma);
  }

  /**
   * Handles reversing earned points and restoring redeemed points on sales returns.
   */
  public async handleSalesReturn(
    companyId: string,
    salesReturnId: string,
    originalInvoiceId: string,
    returnedGrandTotal: number,
    userId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ReturnLoyaltyResult> {
    const client = tx || this.prisma;
    const settings = await this.settingsService.getSettings(companyId, tx);

    const invoice = await client.salesInvoice.findUnique({
      where: { id: originalInvoiceId },
      include: { customer: true },
    });
    if (!invoice || !invoice.customerId) {
      return { pointsReversed: 0, pointsRestored: 0, refundDeductionOffset: 0 };
    }

    const customerId = invoice.customerId;
    const originalTotal = invoice.grandTotal > 0 ? invoice.grandTotal : 1;
    const returnRatio = Math.min(1, Math.max(0, returnedGrandTotal / originalTotal));

    const wallet = await client.customerWallet.findUnique({
      where: { customerId },
    });
    if (!wallet) {
      return { pointsReversed: 0, pointsRestored: 0, refundDeductionOffset: 0 };
    }

    let pointsToReverse = 0;
    let refundDeductionOffset = 0;
    let pointsToRestore = 0;

    // 1. Reverse Earned Points
    if (invoice.pointsEarned && invoice.pointsEarned > 0) {
      const calculatedPointsToReverse = Math.floor(invoice.pointsEarned * returnRatio);

      if (calculatedPointsToReverse > 0) {
        const available = wallet.cachedAvailablePoints;
        const deficit = calculatedPointsToReverse - available;

        if (deficit > 0 && settings.negativeBalancePolicy === 'DEDUCT_FROM_REFUND') {
          // Deduct what is available from points, and offset the rest in monetary cash refund
          pointsToReverse = Math.max(0, available);
          refundDeductionOffset = SalesCalculationService.round(
            deficit * settings.redemptionValue,
            2,
          );
        } else if (deficit > 0 && settings.negativeBalancePolicy === 'CLAMP_TO_ZERO') {
          pointsToReverse = Math.max(0, available);
        } else {
          // ALLOW_NEGATIVE (or sufficient points)
          pointsToReverse = calculatedPointsToReverse;
        }

        if (pointsToReverse > 0) {
          const newBalance = wallet.cachedAvailablePoints - pointsToReverse;
          const idempotencyKey = `RETURN_REV_${salesReturnId}`;

          const existing = await client.loyaltyTransaction.findUnique({
            where: { companyId_idempotencyKey: { companyId, idempotencyKey } },
          });

          if (!existing) {
            await client.loyaltyTransaction.create({
              data: {
                companyId,
                customerId,
                walletId: wallet.id,
                transactionType: 'RETURN_REVERSAL',
                points: -pointsToReverse,
                balanceAfter: newBalance,
                referenceType: 'SALE_RETURN',
                referenceId: salesReturnId,
                salesReturnId,
                salesInvoiceId: invoice.id,
                invoiceNumberSnapshot: invoice.invoiceNumber,
                description: `Reversal of ${pointsToReverse} points earned on return of ${invoice.invoiceNumber}`,
                idempotencyKey,
                createdBy: userId || null,
              },
            });

            await client.customerWallet.update({
              where: { id: wallet.id },
              data: {
                cachedAvailablePoints: newBalance,
                cachedLifetimeReversed: { increment: pointsToReverse },
              },
            });
          }
        }
      }
    }

    // 2. Restore Redeemed Points proportionally
    if (invoice.pointsRedeemed && invoice.pointsRedeemed > 0) {
      pointsToRestore = Math.floor(invoice.pointsRedeemed * returnRatio);

      if (pointsToRestore > 0) {
        const currentWallet = await client.customerWallet.findUnique({ where: { id: wallet.id } });
        const curBal = currentWallet ? currentWallet.cachedAvailablePoints : wallet.cachedAvailablePoints;
        const newBalance = curBal + pointsToRestore;
        const idempotencyKey = `RETURN_REST_${salesReturnId}`;

        const existing = await client.loyaltyTransaction.findUnique({
          where: { companyId_idempotencyKey: { companyId, idempotencyKey } },
        });

        if (!existing) {
          const txn = await client.loyaltyTransaction.create({
            data: {
              companyId,
              customerId,
              walletId: wallet.id,
              transactionType: 'RETURN_RESTORE',
              points: pointsToRestore,
              balanceAfter: newBalance,
              referenceType: 'SALE_RETURN',
              referenceId: salesReturnId,
              salesReturnId,
              salesInvoiceId: invoice.id,
              invoiceNumberSnapshot: invoice.invoiceNumber,
              description: `Restored ${pointsToRestore} redeemed points on return of ${invoice.invoiceNumber}`,
              idempotencyKey,
              createdBy: userId || null,
            },
          });

          // Create new lot for restored points if expiry enabled
          if (settings.pointExpiryDays > 0) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + settings.pointExpiryDays);

            await client.loyaltyPointLot.create({
              data: {
                companyId,
                customerId,
                walletId: wallet.id,
                sourceTransactionId: txn.id,
                originalPoints: pointsToRestore,
                remainingPoints: pointsToRestore,
                expiresAt,
                status: 'ACTIVE',
              },
            });
          }

          await client.customerWallet.update({
            where: { id: wallet.id },
            data: {
              cachedAvailablePoints: newBalance,
              cachedLifetimeRedeemed: { decrement: pointsToRestore },
            },
          });
        }
      }
    }

    // Update return record
    await client.salesReturn.update({
      where: { id: salesReturnId },
      data: {
        pointsReversed: pointsToReverse,
        pointsRestored: pointsToRestore,
      },
    });

    return {
      pointsReversed: pointsToReverse,
      pointsRestored: pointsToRestore,
      refundDeductionOffset,
    };
  }
}
