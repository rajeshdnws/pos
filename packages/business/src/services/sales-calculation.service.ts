import {
  SalesCalculationInput,
  SalesCalculationInputItem,
  SalesCalculationResult,
  SalesLineCalculationResult,
} from '@rs-inventory/types';

export class SalesCalculationService {
  /**
   * Safe decimal rounding to 2 decimal places (or specified decimals).
   */
  public static round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  /**
   * Determine whether a transaction is interstate based on company state vs customer state.
   */
  public static isInterstate(
    companyState?: string | null,
    customerState?: string | null,
  ): boolean {
    if (!companyState || !customerState) {
      return false; // Default to intra-state if either state is not specified
    }
    return companyState.trim().toLowerCase() !== customerState.trim().toLowerCase();
  }

  /**
   * Calculate a single sales line item.
   */
  public static calculateLine(
    item: SalesCalculationInputItem,
    isInterstate: boolean,
  ): SalesLineCalculationResult {
    const quantity = item.quantity || 0;
    const sellingRate = item.sellingRate !== undefined ? item.sellingRate : (item.unitPrice || 0);
    const grossAmount = SalesCalculationService.round(quantity * sellingRate, 2);

    let discountAmount = 0;
    let discountPercentage = 0;

    if (item.discountPercentage !== undefined && item.discountPercentage > 0) {
      discountPercentage = SalesCalculationService.round(item.discountPercentage, 2);
      discountAmount = SalesCalculationService.round(
        (grossAmount * discountPercentage) / 100,
        2,
      );
    } else if (item.discountAmount !== undefined && item.discountAmount > 0) {
      discountAmount = SalesCalculationService.round(item.discountAmount, 2);
      if (grossAmount > 0) {
        discountPercentage = SalesCalculationService.round(
          (discountAmount / grossAmount) * 100,
          2,
        );
      }
    }

    if (discountAmount > grossAmount) {
      discountAmount = grossAmount;
    }

    const taxableAmount = SalesCalculationService.round(grossAmount - discountAmount, 2);
    const taxRate = item.taxRate !== undefined ? item.taxRate : 0;

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
        igstAmount = SalesCalculationService.round((taxableAmount * igstRate) / 100, 2);
      } else {
        cgstRate = SalesCalculationService.round(taxRate / 2, 2);
        sgstRate = SalesCalculationService.round(taxRate / 2, 2);
        cgstAmount = SalesCalculationService.round((taxableAmount * cgstRate) / 100, 2);
        sgstAmount = SalesCalculationService.round((taxableAmount * sgstRate) / 100, 2);
      }
    }

    const taxAmount = SalesCalculationService.round(
      cgstAmount + sgstAmount + igstAmount + cessAmount,
      2,
    );
    const lineTotal = SalesCalculationService.round(taxableAmount + taxAmount, 2);

    return {
      productId: item.productId,
      quantity,
      sellingRate,
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
   * Calculate full sales invoice totals.
   */
  public static calculateInvoice(input: SalesCalculationInput): SalesCalculationResult {
    const isInterstate = input.isInterstate !== undefined
      ? input.isInterstate
      : SalesCalculationService.isInterstate(input.companyState, input.customerState);

    const calculatedItems = (input.items || []).map((item) =>
      SalesCalculationService.calculateLine(item, isInterstate),
    );

    const subtotal = SalesCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.grossAmount, 0),
      2,
    );
    const lineDiscountTotal = SalesCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.discountAmount, 0),
      2,
    );
    let invoiceDiscount = 0;
    if (input.invoiceDiscount !== undefined && input.invoiceDiscount !== null) {
      invoiceDiscount = SalesCalculationService.round(input.invoiceDiscount, 2);
    } else if (input.discountValue !== undefined && input.discountValue !== null) {
      if (input.discountType === 'PERCENTAGE') {
        const taxableBeforeBillDisc = subtotal - lineDiscountTotal;
        invoiceDiscount = SalesCalculationService.round((taxableBeforeBillDisc * input.discountValue) / 100, 2);
      } else {
        invoiceDiscount = SalesCalculationService.round(input.discountValue, 2);
      }
    }
    const totalDiscount = SalesCalculationService.round(lineDiscountTotal + invoiceDiscount, 2);

    const rawTaxableAmount = SalesCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.taxableAmount, 0),
      2,
    );
    const taxableAmount = Math.max(
      0,
      SalesCalculationService.round(rawTaxableAmount - invoiceDiscount, 2),
    );

    const cgstAmount = SalesCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.cgstAmount, 0),
      2,
    );
    const sgstAmount = SalesCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.sgstAmount, 0),
      2,
    );
    const igstAmount = SalesCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.igstAmount, 0),
      2,
    );
    const cessAmount = SalesCalculationService.round(
      calculatedItems.reduce((sum, item) => sum + item.cessAmount, 0),
      2,
    );
    const otherTaxAmount = 0;
    const additionalCharges = SalesCalculationService.round(input.additionalCharges || 0, 2);

    const preRoundGrandTotal = SalesCalculationService.round(
      taxableAmount + cgstAmount + sgstAmount + igstAmount + cessAmount + additionalCharges,
      2,
    );

    let roundOff = 0;
    if (input.roundOff !== undefined && input.roundOff !== null) {
      roundOff = SalesCalculationService.round(input.roundOff, 2);
    } else {
      const roundedInt = Math.round(preRoundGrandTotal);
      roundOff = SalesCalculationService.round(roundedInt - preRoundGrandTotal, 2);
    }

    const grandTotal = SalesCalculationService.round(preRoundGrandTotal + roundOff, 2);

    return {
      subtotal,
      lineDiscountTotal,
      invoiceDiscount,
      totalDiscount,
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

  /**
   * Alias for calculateInvoice
   */
  public static calculate(input: SalesCalculationInput): SalesCalculationResult {
    return SalesCalculationService.calculateInvoice(input);
  }
}
