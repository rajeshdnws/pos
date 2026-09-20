import { LoyaltySettingsDTO } from '@rs-inventory/types';
import { SalesCalculationService } from '../sales-calculation.service.js';

export interface InvoiceEligibleComponents {
  subtotal: number;
  lineDiscountTotal?: number;
  invoiceDiscount?: number;
  couponDiscount?: number;
  pointsDiscount?: number;
  taxAmount?: number;
  additionalCharges?: number;
}

export class LoyaltyCalculationService {
  /**
   * Computes qualifying spend for points calculation based on shop configuration.
   */
  public static calculateEligibleAmount(
    settings: LoyaltySettingsDTO,
    components: InvoiceEligibleComponents,
  ): number {
    if (!settings.enabled) return 0;

    const totalDiscount = SalesCalculationService.round(
      (components.lineDiscountTotal || 0) +
        (components.invoiceDiscount || 0) +
        (components.couponDiscount || 0) +
        (components.pointsDiscount || 0),
      2,
    );

    // If earning is disallowed on discounted bills
    if (!settings.allowEarningOnDiscountedBills && totalDiscount > 0) {
      return 0;
    }

    // If earning is disallowed on bills where points were redeemed
    if (
      !settings.allowEarningOnBillsWithRedemption &&
      (components.pointsDiscount || 0) > 0
    ) {
      return 0;
    }

    // Base qualifying items total (subtotal minus item/bill discounts and points discount)
    let eligible = SalesCalculationService.round(
      components.subtotal -
        ((components.lineDiscountTotal || 0) +
          (components.invoiceDiscount || 0) +
          (components.couponDiscount || 0) +
          (components.pointsDiscount || 0)),
      2,
    );

    // Optional inclusion of tax
    if (settings.allowEarningOnTax && components.taxAmount) {
      eligible = SalesCalculationService.round(eligible + components.taxAmount, 2);
    }

    // Optional inclusion of delivery/other charges
    if (settings.allowEarningOnAdditionalCharges && components.additionalCharges) {
      eligible = SalesCalculationService.round(eligible + components.additionalCharges, 2);
    }

    return Math.max(0, eligible);
  }

  /**
   * Calculates points earned on an eligible amount with integer-safe floor policy.
   */
  public static calculateEarnedPoints(
    settings: LoyaltySettingsDTO,
    eligibleAmount: number,
  ): number {
    if (!settings.enabled || eligibleAmount <= 0) {
      return 0;
    }

    if (settings.earningMethod === 'FLAT_PER_ORDER') {
      return eligibleAmount >= settings.eligibleAmount ? settings.pointsPerEligibleAmount : 0;
    }

    // AMOUNT_SPENT: Floor integer points per eligible spend unit (e.g. 1 point per ₹100)
    const factor = eligibleAmount / settings.eligibleAmount;
    const rawPoints = factor * settings.pointsPerEligibleAmount;
    return Math.floor(rawPoints);
  }

  /**
   * Computes maximum points and discount permitted for redemption against a bill.
   */
  public static calculateMaxRedemption(
    settings: LoyaltySettingsDTO,
    availablePoints: number,
    billSubtotal: number,
  ): {
    maxRedeemablePoints: number;
    maxDiscountAmount: number;
    eligible: boolean;
    reason?: string;
  } {
    if (!settings.enabled) {
      return { maxRedeemablePoints: 0, maxDiscountAmount: 0, eligible: false, reason: 'Loyalty program is disabled.' };
    }
    if (availablePoints <= 0) {
      return { maxRedeemablePoints: 0, maxDiscountAmount: 0, eligible: false, reason: 'No available loyalty points.' };
    }
    if (billSubtotal < settings.minimumBillAmount) {
      return {
        maxRedeemablePoints: 0,
        maxDiscountAmount: 0,
        eligible: false,
        reason: `Bill amount ₹${billSubtotal.toFixed(2)} is below minimum ₹${settings.minimumBillAmount.toFixed(2)} required for redemption.`,
      };
    }
    if (availablePoints < settings.minimumRedemptionPoints) {
      return {
        maxRedeemablePoints: 0,
        maxDiscountAmount: 0,
        eligible: false,
        reason: `Available points (${availablePoints}) is below minimum (${settings.minimumRedemptionPoints}) required for redemption.`,
      };
    }

    // Cap 1: Maximum % of bill payable by points
    const maxBillPortion = SalesCalculationService.round(
      billSubtotal * (settings.maximumRedemptionPercentage / 100),
      2,
    );
    const maxPointsByPercentage = Math.floor(maxBillPortion / settings.redemptionValue);

    // Cap 2: Absolute bill total cap
    const maxPointsByBill = Math.floor(billSubtotal / settings.redemptionValue);

    // Bound by customer's available points
    let maxPoints = Math.min(Math.floor(availablePoints), maxPointsByPercentage, maxPointsByBill);

    // Apply redemption increment (e.g. in steps of 1)
    const increment = Math.max(1, settings.minimumRedemptionIncrement || 1);
    maxPoints = Math.floor(maxPoints / increment) * increment;

    if (maxPoints < settings.minimumRedemptionPoints) {
      return {
        maxRedeemablePoints: 0,
        maxDiscountAmount: 0,
        eligible: false,
        reason: `Max redeemable points for this bill (${maxPoints}) is less than minimum redemption threshold (${settings.minimumRedemptionPoints}).`,
      };
    }

    const maxDiscountAmount = SalesCalculationService.round(maxPoints * settings.redemptionValue, 2);

    return {
      maxRedeemablePoints: maxPoints,
      maxDiscountAmount,
      eligible: true,
    };
  }
}
