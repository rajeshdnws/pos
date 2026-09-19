import { PrismaClient } from '@prisma/client';
import {
  DateRangeFilter,
  SalesReportFilters,
  PurchaseReportFilters,
  InventoryReportFilters,
  OutstandingReportFilters,
  ExpenseReportFilters,
  TaxReportFilters,
  BusinessDashboardKPIs,
  DashboardChartsData,
  TrendDataPoint,
  CategoryShareDataPoint,
  TopProductDataPoint,
  PaymentMethodDataPoint,
  PaginatedResult,
  SalesReportSummary,
  SalesInvoiceReportRow,
  ProductSalesReportRow,
  CategorySalesReportRow,
  CustomerSalesReportRow,
  PaymentCollectionRow,
  PurchaseReportSummary,
  PurchaseInvoiceReportRow,
  ProductPurchaseReportRow,
  SupplierReportRow,
  InventoryCurrentStockRow,
  LowStockReportRow,
  OutOfStockReportRow,
  StockMovementReportRow,
  InventoryValuationSummary,
  StockAdjustmentReportRow,
  ProfitLossReport,
  CustomerOutstandingRow,
  SupplierOutstandingRow,
  ExpenseSummaryReport,
  CashbookReportSummary,
  RegisterClosingReportRow,
  TaxSummaryReport,
} from '@rs-inventory/types';
import { resolveDateRange, roundCurrency, safeDivide, roundPercent } from '../repositories/reporting.repository.js';
import { SalesReportService } from './sales-report.service.js';
import { PurchaseReportService } from './purchase-report.service.js';
import { InventoryReportService } from './inventory-report.service.js';
import { ProfitLossReportService } from './profit-loss-report.service.js';
import { ReceivablesPayablesReportService } from './receivables-payables-report.service.js';
import { CashReportService } from './cash-report.service.js';
import { TaxReportService } from './tax-report.service.js';
import { CashRegisterService } from './cash-register.service.js';

export class ReportingService {
  private salesReport: SalesReportService;
  private purchaseReport: PurchaseReportService;
  private inventoryReport: InventoryReportService;
  private plReport: ProfitLossReportService;
  private receivablesPayablesReport: ReceivablesPayablesReportService;
  private cashReport: CashReportService;
  private taxReport: TaxReportService;
  private registerService: CashRegisterService;

  constructor(private readonly prisma: PrismaClient) {
    this.salesReport = new SalesReportService(prisma);
    this.purchaseReport = new PurchaseReportService(prisma);
    this.inventoryReport = new InventoryReportService(prisma);
    this.plReport = new ProfitLossReportService(prisma);
    this.receivablesPayablesReport = new ReceivablesPayablesReportService(prisma);
    this.cashReport = new CashReportService(prisma);
    this.taxReport = new TaxReportService(prisma);
    this.registerService = new CashRegisterService(prisma);
  }

  // ── Dashboard KPIs ────────────────────────────────────────────────────────────

  public async getBusinessDashboardKPIs(
    companyId: string,
    filters: DateRangeFilter = { period: 'this_month' },
  ): Promise<BusinessDashboardKPIs> {
    const range = resolveDateRange(filters);

    const [plReport, expenseSummary, customerOutstanding, supplierOutstanding, inventoryValuation] =
      await Promise.all([
        this.plReport.getProfitLoss(companyId, filters),
        this.cashReport.getExpenseSummary(companyId, filters),
        this.receivablesPayablesReport.getCustomerOutstanding(companyId, { asOfDate: range.endDateStr }),
        this.receivablesPayablesReport.getSupplierOutstanding(companyId, { asOfDate: range.endDateStr }),
        this.inventoryReport.getInventoryValuationReport(companyId, {}),
      ]);

    // Purchase counts in period
    const [purchaseAgg, purchaseReturnAgg] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: { companyId, status: 'POSTED', purchaseDate: { gte: range.gte, lte: range.lte } },
        _sum: { grandTotal: true }, _count: true,
      }),
      this.prisma.purchaseReturn.aggregate({
        where: { companyId, status: 'POSTED', returnDate: { gte: range.gte, lte: range.lte } },
        _sum: { grandTotal: true },
      }),
    ]);

    // Sales invoice count
    const salesCount = await this.prisma.salesInvoice.count({
      where: { companyId, status: 'POSTED', invoiceDate: { gte: range.gte, lte: range.lte } },
    });

    // Inventory stats
    const outOfStockCount = await this.prisma.product.count({
      where: { companyId, trackStock: true, isActive: true, currentStock: { lte: 0 } },
    });

    // Active session for cash in drawer
    const activeSession = await this.registerService.getActiveSession(companyId);
    let currentCashInDrawer: number | null = null;
    if (activeSession) {
      const summary = await this.registerService.getSessionSummary(companyId, activeSession.id);
      currentCashInDrawer = summary.expectedCash;
    }

    // Cash movements in period (sales cash and collections)
    const cashMovements = await this.prisma.cashMovement.findMany({
      where: { companyId, movementDate: { gte: range.gte, lte: range.lte } },
      select: { movementType: true, amount: true },
    });

    let cashSalesInPeriod = 0;
    let cashExpensesInPeriod = 0;
    let cashCollectionsInPeriod = 0;
    for (const m of cashMovements) {
      if (m.movementType === 'CASH_SALE') cashSalesInPeriod += m.amount;
      if (m.movementType === 'CASH_EXPENSE') cashExpensesInPeriod += m.amount;
      if (m.movementType === 'CUSTOMER_PAYMENT') cashCollectionsInPeriod += m.amount;
    }

    const grossPurchases = roundCurrency(purchaseAgg._sum.grandTotal ?? 0);
    const purchaseReturns = roundCurrency(purchaseReturnAgg._sum.grandTotal ?? 0);
    const totalReceivables = roundCurrency(
      customerOutstanding.filter((c) => c.balanceType === 'RECEIVABLE').reduce((s, c) => s + c.closingBalance, 0),
    );
    const totalPayables = roundCurrency(
      supplierOutstanding.filter((s) => s.balanceType === 'PAYABLE').reduce((s, r) => s + r.closingBalance, 0),
    );

    // Low stock filter (currentStock <= minimumStock)
    const lowStockProducts = await this.prisma.product.findMany({
      where: { companyId, trackStock: true, isActive: true, currentStock: { gt: 0 }, minimumStock: { gt: 0 } },
      select: { currentStock: true, minimumStock: true },
    });
    const actualLowStock = lowStockProducts.filter((p) => p.currentStock <= p.minimumStock).length;

    return {
      startDate: range.startDateStr,
      endDate: range.endDateStr,
      period: range.label,
      grossSales: plReport.grossSales,
      salesReturns: plReport.salesReturns,
      netSales: plReport.netSales,
      salesInvoiceCount: salesCount,
      averageInvoiceValue: roundCurrency(safeDivide(plReport.grossSales, salesCount)),
      grossPurchases,
      purchaseReturns,
      netPurchases: roundCurrency(grossPurchases - purchaseReturns),
      purchaseInvoiceCount: purchaseAgg._count,
      totalExpenses: expenseSummary.totalExpenses,
      expensesByCategory: expenseSummary.rows.map((r) => ({ categoryName: r.categoryName, amount: r.totalAmount })),
      grossCOGS: plReport.netCOGS,
      grossProfit: plReport.grossProfit,
      grossProfitMargin: plReport.grossProfitMargin,
      hasCostData: plReport.hasCostData,
      totalReceivables,
      customersWithBalance: customerOutstanding.filter((c) => c.closingBalance > 0).length,
      totalPayables,
      suppliersWithBalance: supplierOutstanding.filter((s) => s.closingBalance > 0).length,
      totalStockValue: inventoryValuation.totalEstimatedValue,
      totalStockItems: inventoryValuation.totalProducts,
      lowStockCount: actualLowStock,
      outOfStockCount,
      cashSalesInPeriod: roundCurrency(cashSalesInPeriod),
      cashExpensesInPeriod: roundCurrency(cashExpensesInPeriod),
      cashCollectionsInPeriod: roundCurrency(cashCollectionsInPeriod),
      currentCashInDrawer,
      activeSessionId: activeSession?.id ?? null,
    };
  }

  // ── Dashboard Charts Data ─────────────────────────────────────────────────────

  public async getDashboardChartsData(
    companyId: string,
    filters: DateRangeFilter = { period: 'this_month' },
  ): Promise<DashboardChartsData> {
    const range = resolveDateRange(filters);

    // Build daily/weekly trend data
    const salesByDay = await this.prisma.salesInvoice.groupBy({
      by: ['invoiceDate'],
      where: { companyId, status: 'POSTED', invoiceDate: { gte: range.gte, lte: range.lte } },
      _sum: { grandTotal: true },
      orderBy: { invoiceDate: 'asc' },
    });

    const purchasesByDay = await this.prisma.purchase.groupBy({
      by: ['purchaseDate'],
      where: { companyId, status: 'POSTED', purchaseDate: { gte: range.gte, lte: range.lte } },
      _sum: { grandTotal: true },
      orderBy: { purchaseDate: 'asc' },
    });

    const expensesByDay = await this.prisma.expense.groupBy({
      by: ['expenseDate'],
      where: { companyId, status: 'POSTED', expenseDate: { gte: range.gte, lte: range.lte } },
      _sum: { amount: true },
      orderBy: { expenseDate: 'asc' },
    });

    // Merge into trend map
    const trendMap = new Map<string, { sales: number; purchases: number; expenses: number }>();
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    for (const s of salesByDay) {
      const k = toDateStr(new Date(s.invoiceDate));
      const ex = trendMap.get(k) ?? { sales: 0, purchases: 0, expenses: 0 };
      ex.sales += s._sum.grandTotal ?? 0;
      trendMap.set(k, ex);
    }
    for (const p of purchasesByDay) {
      const k = toDateStr(new Date(p.purchaseDate));
      const ex = trendMap.get(k) ?? { sales: 0, purchases: 0, expenses: 0 };
      ex.purchases += p._sum.grandTotal ?? 0;
      trendMap.set(k, ex);
    }
    for (const e of expensesByDay) {
      const k = toDateStr(new Date(e.expenseDate));
      const ex = trendMap.get(k) ?? { sales: 0, purchases: 0, expenses: 0 };
      ex.expenses += e._sum.amount ?? 0;
      trendMap.set(k, ex);
    }

    const salesTrend: TrendDataPoint[] = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        sales: roundCurrency(data.sales),
        purchases: roundCurrency(data.purchases),
        expenses: roundCurrency(data.expenses),
        grossProfit: null, // can be extended with COGS data
      }));

    // Category share from sales items
    const catReport = await this.salesReport.getCategorySalesReport(companyId, filters);
    const categoryShare: CategoryShareDataPoint[] = catReport.map((c) => ({
      name: c.categoryName,
      value: c.netSales,
      percent: c.sharePercent,
    }));

    // Top products by quantity and value
    const productReport = await this.salesReport.getProductSalesReport(companyId, filters);
    const topProductsByQuantity: TopProductDataPoint[] = productReport
      .slice()
      .sort((a, b) => b.netQuantitySold - a.netQuantitySold)
      .slice(0, 10)
      .map((p) => ({
        productName: p.productName,
        sku: p.sku,
        quantity: p.netQuantitySold,
        netSales: p.netSales,
        grossProfit: p.grossProfit,
      }));

    const topProductsByValue: TopProductDataPoint[] = productReport
      .slice()
      .sort((a, b) => b.netSales - a.netSales)
      .slice(0, 10)
      .map((p) => ({
        productName: p.productName,
        sku: p.sku,
        quantity: p.netQuantitySold,
        netSales: p.netSales,
        grossProfit: p.grossProfit,
      }));

    // Payment method distribution
    const paymentGroups = await this.prisma.salesPayment.groupBy({
      by: ['paymentMode'],
      where: { companyId, status: 'POSTED', paymentDate: { gte: range.gte, lte: range.lte } },
      _sum: { amount: true },
      _count: true,
    });
    const totalPayments = paymentGroups.reduce((s, p) => s + (p._sum.amount ?? 0), 0);
    const paymentMethodDistribution: PaymentMethodDataPoint[] = paymentGroups.map((p) => ({
      method: p.paymentMode,
      amount: roundCurrency(p._sum.amount ?? 0),
      count: p._count,
      percent: roundPercent(safeDivide(p._sum.amount ?? 0, totalPayments) * 100),
    }));

    // Low stock products
    const lowStockProducts = await this.inventoryReport.getLowStockReport(companyId, {});

    return {
      salesTrend,
      categoryShare,
      topProductsByQuantity,
      topProductsByValue,
      paymentMethodDistribution,
      lowStockProducts,
    };
  }

  // ── Delegated Report Methods ──────────────────────────────────────────────────

  public getSalesSummary = (c: string, f?: SalesReportFilters): Promise<SalesReportSummary> =>
    this.salesReport.getSalesSummary(c, f);

  public getSalesInvoiceList = (c: string, f?: SalesReportFilters): Promise<PaginatedResult<SalesInvoiceReportRow>> =>
    this.salesReport.getSalesInvoiceList(c, f);

  public getProductSalesReport = (c: string, f?: SalesReportFilters): Promise<ProductSalesReportRow[]> =>
    this.salesReport.getProductSalesReport(c, f);

  public getCategorySalesReport = (c: string, f?: SalesReportFilters): Promise<CategorySalesReportRow[]> =>
    this.salesReport.getCategorySalesReport(c, f);

  public getCustomerSalesReport = (c: string, f?: SalesReportFilters): Promise<CustomerSalesReportRow[]> =>
    this.salesReport.getCustomerSalesReport(c, f);

  public getPaymentCollections = (c: string, f?: SalesReportFilters): Promise<PaginatedResult<PaymentCollectionRow>> =>
    this.salesReport.getPaymentCollections(c, f);

  public getPurchaseSummary = (c: string, f?: PurchaseReportFilters): Promise<PurchaseReportSummary> =>
    this.purchaseReport.getPurchaseSummary(c, f);

  public getPurchaseInvoiceList = (c: string, f?: PurchaseReportFilters): Promise<PaginatedResult<PurchaseInvoiceReportRow>> =>
    this.purchaseReport.getPurchaseInvoiceList(c, f);

  public getProductPurchaseReport = (c: string, f?: PurchaseReportFilters): Promise<ProductPurchaseReportRow[]> =>
    this.purchaseReport.getProductPurchaseReport(c, f);

  public getSupplierReport = (c: string, f?: PurchaseReportFilters): Promise<SupplierReportRow[]> =>
    this.purchaseReport.getSupplierReport(c, f);

  public getCurrentStockReport = (c: string, f?: InventoryReportFilters): Promise<PaginatedResult<InventoryCurrentStockRow>> =>
    this.inventoryReport.getCurrentStockReport(c, f);

  public getLowStockReport = (c: string, f?: InventoryReportFilters): Promise<LowStockReportRow[]> =>
    this.inventoryReport.getLowStockReport(c, f);

  public getOutOfStockReport = (c: string, f?: InventoryReportFilters): Promise<OutOfStockReportRow[]> =>
    this.inventoryReport.getOutOfStockReport(c, f);

  public getStockMovementsReport = (c: string, f?: InventoryReportFilters): Promise<PaginatedResult<StockMovementReportRow>> =>
    this.inventoryReport.getStockMovementsReport(c, f);

  public getInventoryValuationReport = (c: string, f?: InventoryReportFilters): Promise<InventoryValuationSummary> =>
    this.inventoryReport.getInventoryValuationReport(c, f);

  public getStockAdjustmentsReport = (c: string, f?: InventoryReportFilters): Promise<StockAdjustmentReportRow[]> =>
    this.inventoryReport.getStockAdjustmentsReport(c, f);

  public getProfitLoss = (c: string, f?: DateRangeFilter): Promise<ProfitLossReport> =>
    this.plReport.getProfitLoss(c, f);

  public getCustomerOutstanding = (c: string, f?: OutstandingReportFilters): Promise<CustomerOutstandingRow[]> =>
    this.receivablesPayablesReport.getCustomerOutstanding(c, f);

  public getSupplierOutstanding = (c: string, f?: OutstandingReportFilters): Promise<SupplierOutstandingRow[]> =>
    this.receivablesPayablesReport.getSupplierOutstanding(c, f);

  public getExpenseSummary = (c: string, f?: ExpenseReportFilters): Promise<ExpenseSummaryReport> =>
    this.cashReport.getExpenseSummary(c, f);

  public getCashbookReport = (c: string, f?: DateRangeFilter): Promise<CashbookReportSummary> =>
    this.cashReport.getCashbookReport(c, f);

  public getRegisterClosings = (c: string, f?: DateRangeFilter): Promise<RegisterClosingReportRow[]> =>
    this.cashReport.getRegisterClosings(c, f);

  public getTaxSummary = (c: string, f?: TaxReportFilters): Promise<TaxSummaryReport> =>
    this.taxReport.getTaxSummary(c, f);
}
