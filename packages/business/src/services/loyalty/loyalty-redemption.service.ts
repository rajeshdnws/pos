import { Prisma, PrismaClient } from '@prisma/client';
import {
  LoyaltyRedemptionValidationInputDTO,
  LoyaltyRedemptionValidationResultDTO,
} from '@rs-inventory/types';
import { BusinessRuleError } from '../../errors/app.error.js';
import { SalesCalculationService } from '../sales-calculation.service.js';
import { LoyaltyCalculationService } from './loyalty-calculation.service.js';
import { LoyaltySettingsService } from './loyalty-settings.service.js';
import { LoyaltyWalletService } from './loyalty-wallet.service.js';

export class LoyaltyRedemptionService {
  private settingsService: LoyaltySettingsService;
  private walletService: LoyaltyWalletService;

  constructor(private readonly prisma: PrismaClient) {
    this.settingsService = new LoyaltySettingsService(prisma);
    this.walletService = new LoyaltyWalletService(prisma);
  }

  /**
   * Pre-checkout validation of points redemption request.
   */
  public async validateRedemption(
    companyId: string,
    input: LoyaltyRedemptionValidationInputDTO,
  ): Promise<LoyaltyRedemptionValidationResultDTO> {
    const { customerId, billSubtotal, requestedPoints } = input;
    const settings = await this.settingsService.getSettings(companyId);

    if (!settings.enabled) {
      return {
        isValid: false,
        availablePoints: 0,
        maxRedeemablePoints: 0,
        pointsToRedeem: 0,
        redemptionValue: settings.redemptionValue,
        discountAmount: 0,
        remainingPoints: 0,
        message: 'Loyalty program is currently disabled.',
      };
    }

    const wallet = await this.walletService.getWallet(companyId, customerId);
    const availablePoints = wallet ? Math.max(0, wallet.cachedAvailablePoints) : 0;

    const maxCalc = LoyaltyCalculationService.calculateMaxRedemption(
      settings,
      availablePoints,
      billSubtotal,
    );

    if (!maxCalc.eligible) {
      return {
        isValid: false,
        availablePoints,
        maxRedeemablePoints: 0,
        pointsToRedeem: 0,
        redemptionValue: settings.redemptionValue,
        discountAmount: 0,
        remainingPoints: availablePoints,
        message: maxCalc.reason || 'Not eligible for redemption.',
      };
    }

    if (requestedPoints <= 0) {
      return {
        isValid: false,
        availablePoints,
        maxRedeemablePoints: maxCalc.maxRedeemablePoints,
        pointsToRedeem: 0,
        redemptionValue: settings.redemptionValue,
        discountAmount: 0,
        remainingPoints: availablePoints,
        message: 'Please enter points to redeem.',
      };
    }

    if (requestedPoints > availablePoints) {
      return {
        isValid: false,
        availablePoints,
        maxRedeemablePoints: maxCalc.maxRedeemablePoints,
        pointsToRedeem: 0,
        redemptionValue: settings.redemptionValue,
        discountAmount: 0,
        remainingPoints: availablePoints,
        message: `Insufficient points. Requested ${requestedPoints}, but only ${availablePoints} available.`,
      };
    }

    if (requestedPoints > maxCalc.maxRedeemablePoints) {
      return {
        isValid: false,
        availablePoints,
        maxRedeemablePoints: maxCalc.maxRedeemablePoints,
        pointsToRedeem: 0,
        redemptionValue: settings.redemptionValue,
        discountAmount: 0,
        remainingPoints: availablePoints,
        message: `Requested ${requestedPoints} points exceeds maximum permissible ${maxCalc.maxRedeemablePoints} points for this bill.`,
      };
    }

    const discountAmount = SalesCalculationService.round(
      requestedPoints * settings.redemptionValue,
      2,
    );

    return {
      isValid: true,
      availablePoints,
      maxRedeemablePoints: maxCalc.maxRedeemablePoints,
      pointsToRedeem: requestedPoints,
      redemptionValue: settings.redemptionValue,
      discountAmount,
      remainingPoints: availablePoints - requestedPoints,
      message: `Eligible for ₹${discountAmount.toFixed(2)} discount using ${requestedPoints} points.`,
    };
  }

  /**
   * Deducts redeemed points atomically within a sale posting transaction using FIFO lot allocation.
   */
  public async deductPoints(
    companyId: string,
    customerId: string,
    pointsToRedeem: number,
    invoiceId: string,
    invoiceNumber: string,
    userId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ transactionId: string; discountAmount: number }> {
    const client = tx || this.prisma;
    const settings = await this.settingsService.getSettings(companyId, tx);

    const wallet = await client.customerWallet.findUnique({
      where: { customerId },
    });
    if (!wallet || wallet.companyId !== companyId) {
      throw new BusinessRuleError('Customer wallet not found.');
    }

    if (wallet.cachedAvailablePoints < pointsToRedeem) {
      throw new BusinessRuleError(
        `Insufficient points available. Balance: ${wallet.cachedAvailablePoints}, required: ${pointsToRedeem}.`,
      );
    }

    const idempotencyKey = `SALE_REDEEM_${invoiceId}`;
    const existing = await client.loyaltyTransaction.findUnique({
      where: { companyId_idempotencyKey: { companyId, idempotencyKey } },
    });
    if (existing) {
      return {
        transactionId: existing.id,
        discountAmount: SalesCalculationService.round(pointsToRedeem * settings.redemptionValue, 2),
      };
    }

    // 1. Allocate points deduction across active lots (FIFO: earliest expiry first, then earliest earned)
    let remainingToDeduct = pointsToRedeem;
    const activeLots = await client.loyaltyPointLot.findMany({
      where: {
        companyId,
        customerId,
        status: 'ACTIVE',
        remainingPoints: { gt: 0 },
      },
      orderBy: [
        { expiresAt: 'asc' },
        { earnedAt: 'asc' },
      ],
    });

    for (const lot of activeLots) {
      if (remainingToDeduct <= 0) break;

      const lotDeduction = Math.min(lot.remainingPoints, remainingToDeduct);
      const newLotRemaining = lot.remainingPoints - lotDeduction;

      await client.loyaltyPointLot.update({
        where: { id: lot.id },
        data: {
          remainingPoints: newLotRemaining,
          status: newLotRemaining <= 0 ? 'FULLY_REDEEMED' : 'ACTIVE',
        },
      });

      remainingToDeduct -= lotDeduction;
    }

    // 2. Record REDEEM ledger entry
    const newBalance = wallet.cachedAvailablePoints - pointsToRedeem;
    const discountAmount = SalesCalculationService.round(pointsToRedeem * settings.redemptionValue, 2);

    const txn = await client.loyaltyTransaction.create({
      data: {
        companyId,
        customerId,
        walletId: wallet.id,
        transactionType: 'REDEEM',
        points: -pointsToRedeem,
        balanceAfter: newBalance,
        referenceType: 'SALE',
        referenceId: invoiceId,
        salesInvoiceId: invoiceId,
        invoiceNumberSnapshot: invoiceNumber,
        description: `Redeemed ${pointsToRedeem} points for ₹${discountAmount.toFixed(2)} discount on ${invoiceNumber}`,
        idempotencyKey,
        createdBy: userId || null,
      },
    });

    // 3. Update customer wallet cached stats
    await client.customerWallet.update({
      where: { id: wallet.id },
      data: {
        cachedAvailablePoints: newBalance,
        cachedLifetimeRedeemed: { increment: pointsToRedeem },
      },
    });

    return { transactionId: txn.id, discountAmount };
  }
}
