import { describe, expect, it } from 'vitest';
import { SalesCalculationService } from '../../packages/business/src/services/sales-calculation.service';

describe('SalesCalculationService Unit Tests', () => {
  it('should accurately calculate intra-state GST lines (CGST 9% + SGST 9% for 18% tax rate)', () => {
    const lineResult = SalesCalculationService.calculateLine(
      {
        quantity: 5,
        unitPrice: 200,
        taxRate: 18,
        discountPercentage: 10, // 10% on 1000 = 100
      },
      false, // Intra-state
    );

    expect(lineResult.grossAmount).toBe(1000);
    expect(lineResult.discountAmount).toBe(100);
    expect(lineResult.taxableAmount).toBe(900);
    expect(lineResult.cgstRate).toBe(9);
    expect(lineResult.sgstRate).toBe(9);
    expect(lineResult.igstRate).toBe(0);
    expect(lineResult.cgstAmount).toBe(81);
    expect(lineResult.sgstAmount).toBe(81);
    expect(lineResult.igstAmount).toBe(0);
    expect(lineResult.taxAmount).toBe(162);
    expect(lineResult.lineTotal).toBe(1062);
  });

  it('should accurately calculate inter-state GST lines (IGST 18%)', () => {
    const lineResult = SalesCalculationService.calculateLine(
      {
        quantity: 2,
        unitPrice: 500,
        taxRate: 18,
      },
      true, // Inter-state
    );

    expect(lineResult.grossAmount).toBe(1000);
    expect(lineResult.taxableAmount).toBe(1000);
    expect(lineResult.cgstRate).toBe(0);
    expect(lineResult.sgstRate).toBe(0);
    expect(lineResult.igstRate).toBe(18);
    expect(lineResult.cgstAmount).toBe(0);
    expect(lineResult.sgstAmount).toBe(0);
    expect(lineResult.igstAmount).toBe(180);
    expect(lineResult.taxAmount).toBe(180);
    expect(lineResult.lineTotal).toBe(1180);
  });

  it('should handle zero-tax (exempt) items properly', () => {
    const lineResult = SalesCalculationService.calculateLine(
      {
        quantity: 10,
        unitPrice: 50,
        taxRate: 0,
      },
      false,
    );

    expect(lineResult.grossAmount).toBe(500);
    expect(lineResult.taxableAmount).toBe(500);
    expect(lineResult.taxAmount).toBe(0);
    expect(lineResult.lineTotal).toBe(500);
  });

  it('should compute full multi-item invoice with bill-level discount and round-off', () => {
    const result = SalesCalculationService.calculate({
      items: [
        {
          quantity: 2,
          unitPrice: 150, // 300
          taxRate: 5, // 5% = 15
        },
        {
          quantity: 1,
          unitPrice: 500, // 500
          taxRate: 18, // 18% = 90
          discountPercentage: 10, // 10% disc on 500 = 50 -> taxable 450 -> tax 18% of 450 = 81
        },
      ],
      isInterstate: false,
      discountType: 'FLAT',
      discountValue: 20, // 20 flat bill discount
    });

    // Gross subtotal = 300 + 500 = 800
    expect(result.subtotal).toBe(800);
    // Line discounts = 50; Bill discount = 20; Total discount = 70
    expect(result.totalDiscount).toBe(70);
    // Taxable subtotal = 800 - 70 = 730
    expect(result.taxableAmount).toBe(730);
    // Check roundOff
    expect(result.grandTotal).toBeGreaterThan(0);
    expect(Math.abs(result.roundOff)).toBeLessThanOrEqual(0.5);
  });

  it('should support safe decimal rounding', () => {
    expect(SalesCalculationService.round(10.555, 2)).toBe(10.56);
    expect(SalesCalculationService.round(10.554, 2)).toBe(10.55);
    expect(SalesCalculationService.round(100.0, 2)).toBe(100);
  });
});
