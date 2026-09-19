import { describe, expect, it } from 'vitest';
import { PurchaseCalculationService } from '../../packages/business/src/services/purchase-calculation.service';

describe('PurchaseCalculationService Unit Tests', () => {
  it('should accurately calculate intra-state GST lines (CGST 9% + SGST 9% for 18% tax rate)', () => {
    const lineResult = PurchaseCalculationService.calculateLine(
      {
        quantity: 10,
        purchaseRate: 100,
        taxRate: 18,
        discountPercentage: 10, // 10% discount on 1000 = 100
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
    const lineResult = PurchaseCalculationService.calculateLine(
      {
        quantity: 5,
        purchaseRate: 200,
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
    const lineResult = PurchaseCalculationService.calculateLine(
      {
        quantity: 20,
        purchaseRate: 50,
        taxRate: 0,
      },
      false,
    );

    expect(lineResult.grossAmount).toBe(1000);
    expect(lineResult.taxableAmount).toBe(1000);
    expect(lineResult.taxAmount).toBe(0);
    expect(lineResult.lineTotal).toBe(1000);
  });

  it('should calculate complete purchase invoice with discounts, additional charges and round-off', () => {
    const invoiceResult = PurchaseCalculationService.calculateInvoice({
      companyState: 'Maharashtra',
      supplierState: 'Maharashtra',
      invoiceDiscount: 50,
      additionalCharges: 100,
      items: [
        {
          quantity: 10,
          purchaseRate: 100, // 1000
          discountAmount: 100, // taxable 900
          taxRate: 18, // cgst 81, sgst 81 (tax 162)
        },
        {
          quantity: 2,
          purchaseRate: 500, // 1000
          discountPercentage: 0, // taxable 1000
          taxRate: 12, // cgst 60, sgst 60 (tax 120)
        },
      ],
    });

    expect(invoiceResult.isInterstate).toBe(false);
    expect(invoiceResult.subtotal).toBe(2000);
    expect(invoiceResult.lineDiscountTotal).toBe(100);
    expect(invoiceResult.invoiceDiscount).toBe(50);
    // rawTaxable = 1900, minus invoice discount 50 = 1850
    expect(invoiceResult.taxableAmount).toBe(1850);
    expect(invoiceResult.cgstAmount).toBe(141);
    expect(invoiceResult.sgstAmount).toBe(141);
    expect(invoiceResult.igstAmount).toBe(0);
    expect(invoiceResult.additionalCharges).toBe(100);

    // pre-round = 1850 + 141 + 141 + 100 = 2232.00
    expect(invoiceResult.grandTotal).toBe(2232);
    expect(invoiceResult.roundOff).toBe(0);
  });

  it('should detect inter-state transactions when states differ', () => {
    const isInter = PurchaseCalculationService.isInterstate('Maharashtra', 'Gujarat');
    expect(isInter).toBe(true);

    const isIntra = PurchaseCalculationService.isInterstate('Maharashtra', 'Maharashtra');
    expect(isIntra).toBe(false);
  });
});
