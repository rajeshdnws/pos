import { describe, it, expect } from 'vitest';

describe('Inventory & Stock Engine Calculation Unit Tests', () => {
  it('should accurately calculate signed stock balances from movement streams', () => {
    const movements = [
      { type: 'OPENING_STOCK', quantity: 100 },
      { type: 'PURCHASE_RECEIPT', quantity: 50 },
      { type: 'SALE', quantity: -20 },
      { type: 'SALES_RETURN', quantity: 5 },
      { type: 'ADJUSTMENT_IN', quantity: 2 },
      { type: 'ADJUSTMENT_OUT', quantity: -3 },
      { type: 'TRANSFER_OUT', quantity: -10 },
      { type: 'TRANSFER_IN', quantity: 10 },
      { type: 'STOCKTAKE_CORRECTION', quantity: -4 },
    ];

    const totalStock = movements.reduce((acc, m) => acc + m.quantity, 0);
    expect(totalStock).toBe(130);
  });

  it('should compute inventory valuation based on purchase cost and retail pricing', () => {
    const stockItems = [
      { currentStock: 50, purchasePrice: 120, sellingPrice: 200 },
      { currentStock: 10, purchasePrice: 450, sellingPrice: 650 },
      { currentStock: 100, purchasePrice: 25, sellingPrice: 40 },
    ];

    const costValuation = stockItems.reduce((acc, item) => acc + item.currentStock * item.purchasePrice, 0);
    const retailValuation = stockItems.reduce((acc, item) => acc + item.currentStock * item.sellingPrice, 0);
    const potentialGrossProfit = retailValuation - costValuation;

    expect(costValuation).toBe(50 * 120 + 10 * 450 + 100 * 25); // 6000 + 4500 + 2500 = 13000
    expect(retailValuation).toBe(50 * 200 + 10 * 650 + 100 * 40); // 10000 + 6500 + 4000 = 20500
    expect(potentialGrossProfit).toBe(7500);
  });

  it('should determine appropriate stock status thresholds', () => {
    const determineStatus = (current: number, min: number) => {
      if (current < 0) return 'NEGATIVE_STOCK';
      if (current === 0) return 'OUT_OF_STOCK';
      if (current <= min) return 'LOW_STOCK';
      return 'IN_STOCK';
    };

    expect(determineStatus(-1, 5)).toBe('NEGATIVE_STOCK');
    expect(determineStatus(0, 10)).toBe('OUT_OF_STOCK');
    expect(determineStatus(4, 5)).toBe('LOW_STOCK');
    expect(determineStatus(5, 5)).toBe('LOW_STOCK');
    expect(determineStatus(6, 5)).toBe('IN_STOCK');
  });

  it('should calculate variance and discrepancies in stocktake accurately', () => {
    const systemQty = 42;
    const countedQty = 38;
    const difference = Number((countedQty - systemQty).toFixed(4));

    expect(difference).toBe(-4);
  });
});
