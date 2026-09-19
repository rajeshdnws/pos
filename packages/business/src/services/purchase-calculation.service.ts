import {
  PurchaseCalculationInput,
  PurchaseCalculationInputItem,
  PurchaseCalculationResult,
  PurchaseLineCalculationResult,
} from '@rs-inventory/types';

export class PurchaseCalculationService {
  /**
   * Safe decimal rounding to 2 decimal places (or specified decimals).
   */
  public static round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  /**
   * Determine whether a transaction is interstate based on company state vs supplier state.
   */
  public static isInterstate(
    companyState?: string | null,
    supplierState?: string | null,
  ): boolean {
    if (!companyState || !supplierState) {
      return false; // Default to intra-state if either state is not specified
    }
    return companyState.trim().toLowerCase() !== supplierState.trim().toLowerCase();
  }

  /**
   * Calculate a single line item.
   */
  public static calculateLine(
    item: PurchaseCalculationInputItem,
    isInterstate: boolean,
  ): PurchaseLineCalculationResult {
    const quantity = item.quantity || 0;
    const freeQuantity = item.freeQuantity || 0;
    const purchaseRate = item.purchaseRate || 0;
    const grossAmount = PurchaseCalculationService.round(quantity * purchaseRate, 2);

    let discountAmount = 0;
    let discountPercentage = 0;

    if (item.discountPercentage !== undefined && item.discountPercentage > 0) {
      discountPercentage = PurchaseCalculationService.round(item.discountPercentage, 2);
      discountAmount = PurchaseCalculationService.round(
        (grossAmount * discountPercentage) / 100,
        2,
      );
    } else if (item.discountAmount !== undefined && item.discountAmount > 0) {
      discountAmount = PurchaseCalculationService.round(item.discountAmount, 2);
      if (grossAmount > 0) {
        discountPercentage = PurchaseCalculationService.round(
          (discountAmount / grossAmount) * 100,
          2,
        );
      }
    }

    if (discountAmount > grossAmount) {
      discountAmount = grossAmount;
    }

    const taxableAmount = PurchaseCalculationService.round(grossAmount - discountAmount, 2);
    const taxRate = item.taxRate || 0;

    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    const cessRate = 0;
    const cessAmount = 0;

    if (taxRate > 0) {
      if (isInterstate) {
        igstRate = taxRate;
        igstAmount = PurchaseCalculationService.round((taxableAmount * igstRate) / 100, 2);
      } else {
        cgstRate = PurchaseCalculationService.round(taxRate / 2, 2);
        sgstRate = PurchaseCalculationService.round(taxRate / 2, 2);
        cgstAmount = PurchaseCalculationService.round((taxableAmount * cgstRate) / 100, 2);
        sgstAmount = PurchaseCalculationService.round((taxableAmount * sgstRate) / 100, 2);
      }
    }

    const taxAmount = PurchaseCalculationService.round(
      cgstAmount + sgstAmount + igstAmount + cessAmount,
      2,
    );
    const lineTotal = PurchaseCalculationService.round(taxableAmount + taxAmount, 2);

    return {
      productId: item.productId,
      quantity,
      freeQuantity,
      purchaseRate,
      grossAmount,
      discountPercentage,
      discountAmount,
      taxableAmount,
      taxRate,
      isInterstate,
      cgstRate,
      sgstRate,
      igstRate,
      cessRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      cessAmount,
      taxAmount,
      lineTotal,
    };
  }

  /**
   * Calculate full purchase invoice totals.
   */
  public static calculateInvoice(input: PurchaseCalculationInput): PurchaseCalculationResult {
    const isInterstate = PurchaseCalculationService.isInterstate(
      input.companyState,
      input.supplierState,
    );

    const calculatedItems = (input.items || []).map((item) =>
      PurchaseCalculationService.calculateLine(item, isInterstate),
    );

    const subtotal = PurchaseCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.grossAmount, 0),
      2,
    );
    const lineDiscountTotal = PurchaseCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.discountAmount, 0),
      2,
    );
    const invoiceDiscount = PurchaseCalculationService.round(input.invoiceDiscount || 0, 2);

    const rawTaxableAmount = PurchaseCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.taxableAmount, 0),
      2,
    );
    const taxableAmount = Math.max(0, PurchaseCalculationService.round(rawTaxableAmount - invoiceDiscount, 2));

    const cgstAmount = PurchaseCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.cgstAmount, 0),
      2,
    );
    const sgstAmount = PurchaseCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.sgstAmount, 0),
      2,
    );
    const igstAmount = PurchaseCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.igstAmount, 0),
      2,
    );
    const cessAmount = PurchaseCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.cessAmount, 0),
      2,
    );
    const otherTaxAmount = 0;
    const additionalCharges = PurchaseCalculationService.round(input.additionalCharges || 0, 2);

    const preRoundGrandTotal = PurchaseCalculationService.round(
      taxableAmount + cgstAmount + sgstAmount + igstAmount + cessAmount + additionalCharges,
      2,
    );

    let roundOff = 0;
    if (input.roundOff !== undefined && input.roundOff !== null) {
      roundOff = PurchaseCalculationService.round(input.roundOff, 2);
    } else {
      const roundedInt = Math.round(preRoundGrandTotal);
      roundOff = PurchaseCalculationService.round(roundedInt - preRoundGrandTotal, 2);
    }

    const grandTotal = PurchaseCalculationService.round(preRoundGrandTotal + roundOff, 2);

    return {
      subtotal,
      lineDiscountTotal,
      invoiceDiscount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      cessAmount,
      otherTaxAmount,
      additionalCharges,
      roundOff,
      grandTotal,
      isInterstate,
      items: calculatedItems,
    };
  }
}
