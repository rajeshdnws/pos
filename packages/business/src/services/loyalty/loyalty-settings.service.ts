import { Prisma, PrismaClient } from '@prisma/client';
import {
  LoyaltySettingsDTO,
  LoyaltySettingsUpdateDTO,
} from '@rs-inventory/types';
import { ValidationError } from '../../errors/app.error.js';
import { AuditService } from '../audit.service.js';

export class LoyaltySettingsService {
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.auditService = new AuditService(prisma);
  }

  /**
   * Retrieves company loyalty settings, creating default settings if not already present.
   */
  public async getSettings(companyId: string, tx?: Prisma.TransactionClient): Promise<LoyaltySettingsDTO> {
    const client = tx || this.prisma;
    const existing = await client.loyaltySettings.findUnique({
      where: { companyId },
    });

    if (existing) {
      return this.mapToDTO(existing);
    }

    // Initialize default settings
    const created = await client.loyaltySettings.create({
      data: {
        companyId,
        enabled: false,
        earningMethod: 'AMOUNT_SPENT',
        eligibleAmount: 100.0,
        pointsPerEligibleAmount: 1.0,
        redemptionValue: 1.0,
        minimumRedemptionPoints: 10.0,
        maximumRedemptionPercentage: 50.0,
        minimumBillAmount: 100.0,
        minimumRedemptionIncrement: 1.0,
        pointExpiryDays: 0,
        allowEarningOnDiscountedBills: true,
        allowEarningOnBillsWithRedemption: true,
        allowEarningOnTax: false,
        allowEarningOnAdditionalCharges: false,
        negativeBalancePolicy: 'ALLOW_NEGATIVE',
        termsAndConditions: 'Earn 1 point for every ₹100 spent. Points can be redeemed on future qualifying purchases.',
      },
    });

    return this.mapToDTO(created);
  }

  /**
   * Updates company loyalty settings with validation.
   */
  public async updateSettings(
    companyId: string,
    dto: LoyaltySettingsUpdateDTO,
    userId?: string,
  ): Promise<LoyaltySettingsDTO> {
    if (dto.eligibleAmount !== undefined && dto.eligibleAmount <= 0) {
      throw new ValidationError('Eligible purchase amount must be greater than zero.');
    }
    if (dto.pointsPerEligibleAmount !== undefined && dto.pointsPerEligibleAmount <= 0) {
      throw new ValidationError('Points per eligible amount must be greater than zero.');
    }
    if (dto.redemptionValue !== undefined && dto.redemptionValue <= 0) {
      throw new ValidationError('Point redemption value must be greater than zero.');
    }
    if (dto.minimumRedemptionPoints !== undefined && dto.minimumRedemptionPoints < 0) {
      throw new ValidationError('Minimum redemption points cannot be negative.');
    }
    if (
      dto.maximumRedemptionPercentage !== undefined &&
      (dto.maximumRedemptionPercentage <= 0 || dto.maximumRedemptionPercentage > 100)
    ) {
      throw new ValidationError('Maximum redemption percentage must be between 1% and 100%.');
    }
    if (dto.minimumBillAmount !== undefined && dto.minimumBillAmount < 0) {
      throw new ValidationError('Minimum bill amount cannot be negative.');
    }
    if (dto.minimumRedemptionIncrement !== undefined && dto.minimumRedemptionIncrement <= 0) {
      throw new ValidationError('Minimum redemption increment must be greater than zero.');
    }
    if (dto.pointExpiryDays !== undefined && dto.pointExpiryDays < 0) {
      throw new ValidationError('Point expiry days cannot be negative.');
    }

    const current = await this.getSettings(companyId);

    const updated = await this.prisma.loyaltySettings.update({
      where: { companyId },
      data: {
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.earningMethod !== undefined && { earningMethod: dto.earningMethod }),
        ...(dto.eligibleAmount !== undefined && { eligibleAmount: dto.eligibleAmount }),
        ...(dto.pointsPerEligibleAmount !== undefined && { pointsPerEligibleAmount: dto.pointsPerEligibleAmount }),
        ...(dto.redemptionValue !== undefined && { redemptionValue: dto.redemptionValue }),
        ...(dto.minimumRedemptionPoints !== undefined && { minimumRedemptionPoints: dto.minimumRedemptionPoints }),
        ...(dto.maximumRedemptionPercentage !== undefined && { maximumRedemptionPercentage: dto.maximumRedemptionPercentage }),
        ...(dto.minimumBillAmount !== undefined && { minimumBillAmount: dto.minimumBillAmount }),
        ...(dto.minimumRedemptionIncrement !== undefined && { minimumRedemptionIncrement: dto.minimumRedemptionIncrement }),
        ...(dto.pointExpiryDays !== undefined && { pointExpiryDays: dto.pointExpiryDays }),
        ...(dto.allowEarningOnDiscountedBills !== undefined && { allowEarningOnDiscountedBills: dto.allowEarningOnDiscountedBills }),
        ...(dto.allowEarningOnBillsWithRedemption !== undefined && { allowEarningOnBillsWithRedemption: dto.allowEarningOnBillsWithRedemption }),
        ...(dto.allowEarningOnTax !== undefined && { allowEarningOnTax: dto.allowEarningOnTax }),
        ...(dto.allowEarningOnAdditionalCharges !== undefined && { allowEarningOnAdditionalCharges: dto.allowEarningOnAdditionalCharges }),
        ...(dto.negativeBalancePolicy !== undefined && { negativeBalancePolicy: dto.negativeBalancePolicy }),
        ...(dto.termsAndConditions !== undefined && { termsAndConditions: dto.termsAndConditions?.trim() || null }),
      },
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      module: 'SETTINGS',
      action: 'LOYALTY_SETTINGS_UPDATE',
      oldValue: current,
      newValue: this.mapToDTO(updated),
    });

    return this.mapToDTO(updated);
  }

  private mapToDTO(entity: any): LoyaltySettingsDTO {
    return {
      id: entity.id,
      companyId: entity.companyId,
      enabled: entity.enabled,
      earningMethod: entity.earningMethod as any,
      eligibleAmount: entity.eligibleAmount,
      pointsPerEligibleAmount: entity.pointsPerEligibleAmount,
      redemptionValue: entity.redemptionValue,
      minimumRedemptionPoints: entity.minimumRedemptionPoints,
      maximumRedemptionPercentage: entity.maximumRedemptionPercentage,
      minimumBillAmount: entity.minimumBillAmount,
      minimumRedemptionIncrement: entity.minimumRedemptionIncrement,
      pointExpiryDays: entity.pointExpiryDays,
      allowEarningOnDiscountedBills: entity.allowEarningOnDiscountedBills,
      allowEarningOnBillsWithRedemption: entity.allowEarningOnBillsWithRedemption,
      allowEarningOnTax: entity.allowEarningOnTax,
      allowEarningOnAdditionalCharges: entity.allowEarningOnAdditionalCharges,
      negativeBalancePolicy: entity.negativeBalancePolicy as any,
      termsAndConditions: entity.termsAndConditions,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
