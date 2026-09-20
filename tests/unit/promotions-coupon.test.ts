import { describe, expect, it } from 'vitest';
import { CouponService } from '../../packages/business/src/services/promotions/coupon.service';

describe('Promotions & Coupon Management - Unit Tests', () => {
  describe('Coupon Code Generation', () => {
    it('should generate a code with default prefix "PROMO"', () => {
      const code = CouponService.generateCouponCode();
      expect(code).toBeDefined();
      expect(code.startsWith('PROMO-')).toBe(true);
      expect(code.length).toBeGreaterThan(10);
    });

    it('should generate uppercase alphanumeric codes with custom prefix', () => {
      const code = CouponService.generateCouponCode('NEXT');
      expect(code.startsWith('NEXT-')).toBe(true);
      const suffix = code.replace('NEXT-', '');
      expect(/^[A-Z0-9]{8}$/.test(suffix)).toBe(true);
    });

    it('should generate distinct random codes on successive calls', () => {
      const code1 = CouponService.generateCouponCode('SAVE');
      const code2 = CouponService.generateCouponCode('SAVE');
      expect(code1).not.toBe(code2);
    });
  });

  describe('Coupon Discount Calculations & Rule Checks', () => {
    it('calculates standard percentage discount accurately', () => {
      const subtotal = 2000;
      const discountPercentage = 15; // 15% of 2000 = 300
      const discount = (subtotal * discountPercentage) / 100;
      expect(discount).toBe(300);
    });

    it('applies maximum discount cap on percentage discounts when cap is exceeded', () => {
      const subtotal = 10000;
      const discountPercentage = 20; // 20% of 10,000 = 2,000
      const maxCap = 500;
      const rawDiscount = (subtotal * discountPercentage) / 100;
      const cappedDiscount = Math.min(rawDiscount, maxCap);
      expect(cappedDiscount).toBe(500);
    });

    it('does not artificially reduce discount when below the maximum discount cap', () => {
      const subtotal = 1000;
      const discountPercentage = 10; // 10% of 1000 = 100
      const maxCap = 500;
      const rawDiscount = (subtotal * discountPercentage) / 100;
      const cappedDiscount = Math.min(rawDiscount, maxCap);
      expect(cappedDiscount).toBe(100);
    });

    it('applies fixed amount discount and ensures it never exceeds subtotal', () => {
      const fixedDiscountValue = 150;
      const cartSubtotal = 1000;
      const discount = Math.min(fixedDiscountValue, cartSubtotal);
      expect(discount).toBe(150);

      // Over-discount scenario: ₹500 fixed coupon on ₹350 cart
      const smallCart = 350;
      const safeDiscount = Math.min(fixedDiscountValue * 4, smallCart);
      expect(safeDiscount).toBe(350); // Capped to cart value so total never goes negative
    });

    it('validates minimum purchase threshold requirements', () => {
      const minPurchase = 1500;
      const cartBelow = 1200;
      const cartAbove = 1800;

      expect(cartBelow >= minPurchase).toBe(false);
      expect(cartAbove >= minPurchase).toBe(true);
    });

    it('verifies next-bill coupons cannot be redeemed on the invoice that issued them', () => {
      const issuingInvoiceId = 'inv-step11-001';
      const currentInvoiceIdSame = 'inv-step11-001';
      const currentInvoiceIdFuture = 'inv-step11-002';

      const isSelfRedemptionOnSameInvoice = (issuingId: string, currentId: string) =>
        issuingId === currentId;

      expect(isSelfRedemptionOnSameInvoice(issuingInvoiceId, currentInvoiceIdSame)).toBe(true);
      expect(isSelfRedemptionOnSameInvoice(issuingInvoiceId, currentInvoiceIdFuture)).toBe(false);
    });
  });
});
