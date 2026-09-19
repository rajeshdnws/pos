import { PrismaClient } from '@prisma/client';
import {
  DateRangeFilter,
  ExpenseCategoryBreakdown,
  ProfitLossReport,
} from '@rs-inventory/types';
import {
  resolveDateRange,
  roundCurrency,
  safeDivide,
  roundPercent,
} from '../repositories/reporting.repository.js';

export class ProfitLossReportService {
  constructor(private readonly prisma: PrismaClient) {}

  public async getProfitLoss(
    companyId: string,
    filters: DateRangeFilter = {},
  ): Promise<ProfitLossReport> {
    const range = resolveDateRange(filters);
    const limitations: string[] = [];

    // ── 1. Revenue ────────────────────────────────────────────────────────────

    const [invoices, salesReturnsAgg] = await Promise.all([
      this.prisma.salesInvoice.aggregate({
        where: { companyId, status: 'POSTED', invoiceDate: { gte: range.gte, lte: range.lte } },
        _sum: {
          grandTotal: true,
          lineDiscountTotal: true,
          invoiceDiscount: true,
        },
      }),
      this.prisma.salesReturn.aggregate({
        where: { companyId, status: 'POSTED', returnDate: { gte: range.gte, lte: range.lte } },
        _sum: { grandTotal: true },
      }),
    ]);

    const grossSales = roundCurrency(invoices._sum.grandTotal ?? 0);
    const salesDiscounts = roundCurrency(
      (invoices._sum.lineDiscountTotal ?? 0) + (invoices._sum.invoiceDiscount ?? 0),
    );
    const salesReturns = roundCurrency(salesReturnsAgg._sum.grandTotal ?? 0);
    const netSales = roundCurrency(grossSales - salesReturns);

    // ── 2. COGS ───────────────────────────────────────────────────────────────

    const salesItems = await this.prisma.salesInvoiceItem.findMany({
      where: {
        salesInvoice: {
          companyId,
          status: 'POSTED',
          invoiceDate: { gte: range.gte, lte: range.lte },
        },
      },
      select: { quantity: true, unitCostSnapshot: true },
    });

    let grossCOGS = 0;
    let itemsWithMissingCost = 0;
    let totalItemsSold = salesItems.length;

    for (const item of salesItems) {
      if (item.unitCostSnapshot > 0) {
        grossCOGS += item.unitCostSnapshot * item.quantity;
      } else {
        itemsWithMissingCost++;
      }
    }
    grossCOGS = roundCurrency(grossCOGS);

    // COGS reversal from sales returns
    const returnItems = await this.prisma.salesReturnItem.findMany({
      where: {
        salesReturn: {
          companyId,
          status: 'POSTED',
          returnDate: { gte: range.gte, lte: range.lte },
        },
        originalSalesInvoiceItem: { isNot: null },
      },
      select: {
        quantity: true,
        originalSalesInvoiceItem: { select: { unitCostSnapshot: true } },
      },
    });

    let cogsReturnReversal = 0;
    for (const ri of returnItems) {
      const cost = ri.originalSalesInvoiceItem?.unitCostSnapshot ?? 0;
      if (cost > 0) {
        cogsReturnReversal += cost * ri.quantity;
      }
    }
    cogsReturnReversal = roundCurrency(cogsReturnReversal);

    const netCOGS = roundCurrency(grossCOGS - cogsReturnReversal);
    const hasCostData = grossCOGS > 0;
    const partialCostData = itemsWithMissingCost > 0 && hasCostData;

    if (itemsWithMissingCost > 0) {
      limitations.push(
        `${itemsWithMissingCost} of ${totalItemsSold} sold line item(s) have no recorded cost. ` +
        `COGS is understated; gross profit may be overstated.`,
      );
    }
    if (!hasCostData) {
      limitations.push('No cost data is available for any sold items in this period. COGS cannot be calculated.');
    }

    // ── 3. Gross Profit ───────────────────────────────────────────────────────

    const grossProfit = roundCurrency(netSales - netCOGS);
    const grossProfitMargin = netSales > 0
      ? roundPercent(safeDivide(grossProfit, netSales) * 100)
      : null;

    if (netSales === 0) {
      limitations.push('Net sales is zero for this period — profit margin cannot be calculated.');
    }

    // ── 4. Operating Expenses ─────────────────────────────────────────────────

    const expenseRows = await this.prisma.expense.groupBy({
      by: ['categoryId', 'categoryNameSnapshot'],
      where: {
        companyId,
        status: 'POSTED',
        expenseDate: { gte: range.gte, lte: range.lte },
      },
      _sum: { amount: true },
      _count: true,
    });

    const expensesByCategory: ExpenseCategoryBreakdown[] = expenseRows
      .map((row) => ({
        categoryName: row.categoryNameSnapshot || 'Uncategorised',
        amount: roundCurrency(row._sum.amount ?? 0),
        count: row._count,
      }))
      .sort((a, b) => b.amount - a.amount);

    const totalOperatingExpenses = roundCurrency(
      expensesByCategory.reduce((s, e) => s + e.amount, 0),
    );

    // ── 5. Estimated Operating Result ─────────────────────────────────────────

    const estimatedOperatingResult = roundCurrency(grossProfit - totalOperatingExpenses);
    const operatingMargin = netSales > 0
      ? roundPercent(safeDivide(estimatedOperatingResult, netSales) * 100)
      : null;

    // ── 6. Disclosures ────────────────────────────────────────────────────────

    limitations.push(
      'This is a management summary estimate. It does not constitute a complete statutory ' +
      'profit and loss statement. Items such as depreciation, loan repayments, capital ' +
      'expenditure, owner withdrawals, and tax are not included.',
    );

    return {
      grossSales,
      salesDiscounts,
      salesReturns,
      netSales,
      grossCOGS,
      cogsReturnReversal,
      netCOGS,
      hasCostData,
      partialCostData,
      itemsWithMissingCost,
      totalItemsSold,
      grossProfit,
      grossProfitMargin,
      expensesByCategory,
      totalOperatingExpenses,
      estimatedOperatingResult,
      operatingMargin,
      startDate: range.startDateStr,
      endDate: range.endDateStr,
      limitations,
      isComplete: hasCostData && !partialCostData,
    };
  }
}
