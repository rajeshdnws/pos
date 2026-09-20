import { describe, expect, it } from 'vitest';
import { LoyaltyCalculationService } from '../../packages/business/src/services/loyalty/loyalty-calculation.service';
import { LoyaltySettingsDTO } from '../../packages/types/src/domain';

describe('LoyaltyCalculationService - Unit Tests', () => {
  const baseSettings: LoyaltySettingsDTO = {
    id: 'settings-1',
    companyId: 'comp-1',
    enabled: true,
    earningMethod: 'AMOUNT_SPENT',
    eligibleAmount: 100,
    pointsPerEligibleAmount: 1,
    redemptionValue: 1.0,
    minimumRedemptionPoints: 10,
    maximumRedemptionPercentage: 50,
    minimumBillAmount: 100,
    minimumRedemptionIncrement: 1,
    pointExpiryDays: 365,
    allowEarningOnDiscountedBills: true,
    allowEarningOnBillsWithRedemption: true,
    allowEarningOnTax: false,
    allowEarningOnAdditionalCharges: false,
    negativeBalancePolicy: 'ALLOW_NEGATIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('calculateEligibleAmount', () => {
    it('returns 0 if loyalty is disabled', () => {
      const settings = { ...baseSettings, enabled: false };
      const eligible = LoyaltyCalculationService.calculateEligibleAmount(settings, {
        subtotal: 500,
      });
      expect(eligible).toBe(0);
    });

    it('returns subtotal minus discounts for qualifying spend', () => {
      const eligible = LoyaltyCalculationService.calculateEligibleAmount(baseSettings, {
        subtotal: 500,
        lineDiscountTotal: 50,
        couponDiscount: 50,
      });
      expect(eligible).toBe(400);
    });

    it('returns 0 on discounted bills if allowEarningOnDiscountedBills is false', () => {
      const settings = { ...baseSettings, allowEarningOnDiscountedBills: false };
      const eligible = LoyaltyCalculationService.calculateEligibleAmount(settings, {
        subtotal: 500,
        invoiceDiscount: 20,
      });
      expect(eligible).toBe(0);
    });

    it('returns 0 on bills with points redemption if allowEarningOnBillsWithRedemption is false', () => {
      const settings = { ...baseSettings, allowEarningOnBillsWithRedemption: false };
      const eligible = LoyaltyCalculationService.calculateEligibleAmount(settings, {
        subtotal: 500,
        pointsDiscount: 50,
      });
      expect(eligible).toBe(0);
    });

    it('includes tax only when allowEarningOnTax is true', () => {
      const withoutTax = LoyaltyCalculationService.calculateEligibleAmount(baseSettings, {
        subtotal: 1000,
        taxAmount: 180,
      });
      expect(withoutTax).toBe(1000);

      const withTaxSettings = { ...baseSettings, allowEarningOnTax: true };
      const withTax = LoyaltyCalculationService.calculateEligibleAmount(withTaxSettings, {
        subtotal: 1000,
        taxAmount: 180,
      });
      expect(withTax).toBe(1180);
    });

    it('includes delivery charges only when allowEarningOnAdditionalCharges is true', () => {
      const withChargesSettings = { ...baseSettings, allowEarningOnAdditionalCharges: true };
      const result = LoyaltyCalculationService.calculateEligibleAmount(withChargesSettings, {
        subtotal: 500,
        additionalCharges: 40,
      });
      expect(result).toBe(540);
    });
  });

  describe('calculateEarnedPoints', () => {
    it('calculates integer floor points for AMOUNT_SPENT (1 pt per ₹100)', () => {
      expect(LoyaltyCalculationService.calculateEarnedPoints(baseSettings, 99.99)).toBe(0);
      expect(LoyaltyCalculationService.calculateEarnedPoints(baseSettings, 100.0)).toBe(1);
      expect(LoyaltyCalculationService.calculateEarnedPoints(baseSettings, 199.99)).toBe(1);
      expect(LoyaltyCalculationService.calculateEarnedPoints(baseSettings, 200.0)).toBe(2);
      expect(LoyaltyCalculationService.calculateEarnedPoints(baseSettings, 1250.0)).toBe(12);
    });

    it('calculates proportional points with custom ratio (e.g. 2 pts per ₹50)', () => {
      const customSettings: LoyaltySettingsDTO = {
        ...baseSettings,
        eligibleAmount: 50,
        pointsPerEligibleAmount: 2,
      };
      expect(LoyaltyCalculationService.calculateEarnedPoints(customSettings, 45)).toBe(1); // 45/50 * 2 = 1.8 -> 1
      expect(LoyaltyCalculationService.calculateEarnedPoints(customSettings, 50)).toBe(2);
      expect(LoyaltyCalculationService.calculateEarnedPoints(customSettings, 100)).toBe(4);
    });

    it('awards flat points on reaching threshold for FLAT_PER_ORDER', () => {
      const flatSettings: LoyaltySettingsDTO = {
        ...baseSettings,
        earningMethod: 'FLAT_PER_ORDER',
        eligibleAmount: 500,
        pointsPerEligibleAmount: 25,
      };
      expect(LoyaltyCalculationService.calculateEarnedPoints(flatSettings, 499)).toBe(0);
      expect(LoyaltyCalculationService.calculateEarnedPoints(flatSettings, 500)).toBe(25);
      expect(LoyaltyCalculationService.calculateEarnedPoints(flatSettings, 2000)).toBe(25);
    });
  });

  describe('calculateMaxRedemption', () => {
    it('rejects if bill amount is below minimumBillAmount', () => {
      const result = LoyaltyCalculationService.calculateMaxRedemption(baseSettings, 100, 80);
      expect(result.eligible).toBe(false);
      expect(result.maxRedeemablePoints).toBe(0);
      expect(result.reason).toContain('below minimum');
    });

    it('rejects if available points is below minimumRedemptionPoints', () => {
      const result = LoyaltyCalculationService.calculateMaxRedemption(baseSettings, 5, 500);
      expect(result.eligible).toBe(false);
      expect(result.maxRedeemablePoints).toBe(0);
      expect(result.reason).toContain('below minimum');
    });

    it('caps redemption to maximumRedemptionPercentage (50% of ₹1000 = ₹500 = 500 pts)', () => {
      // Customer has 800 pts, but 50% cap on ₹1000 is 500 pts
      const result = LoyaltyCalculationService.calculateMaxRedemption(baseSettings, 800, 1000);
      expect(result.eligible).toBe(true);
      expect(result.maxRedeemablePoints).toBe(500);
      expect(result.maxDiscountAmount).toBe(500);
    });

    it('caps redemption to available points if customer has fewer than percentage limit', () => {
      // 50% cap on ₹1000 is 500 pts, customer only has 200 pts
      const result = LoyaltyCalculationService.calculateMaxRedemption(baseSettings, 200, 1000);
      expect(result.eligible).toBe(true);
      expect(result.maxRedeemablePoints).toBe(200);
      expect(result.maxDiscountAmount).toBe(200);
    });

    it('multiplies points by redemptionValue accurately (e.g. ₹0.50 per point)', () => {
      const halfValueSettings: LoyaltySettingsDTO = {
        ...baseSettings,
        redemptionValue: 0.5,
      };
      // Customer has 100 pts at ₹0.50 = ₹50 discount
      const result = LoyaltyCalculationService.calculateMaxRedemption(halfValueSettings, 100, 500);
      expect(result.eligible).toBe(true);
      expect(result.maxRedeemablePoints).toBe(100);
      expect(result.maxDiscountAmount).toBe(50);
    });
  });
});
