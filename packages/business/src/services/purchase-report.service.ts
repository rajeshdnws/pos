import { PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  PurchaseReportFilters,
  PurchaseReportSummary,
  PurchaseInvoiceReportRow,
  ProductPurchaseReportRow,
  SupplierReportRow,
} from '@rs-inventory/types';
import {
  resolveDateRange,
  roundCurrency,
  safeDivide,
} from '../repositories/reporting.repository.js';

export class PurchaseReportService {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Purchase Summary ─────────────────────────────────────────────────────────

  public async getPurchaseSummary(
    companyId: string,
    filters: PurchaseReportFilters = {},
  ): Promise<PurchaseReportSummary> {
    const range = resolveDateRange(filters);

    const [purchases, returns, payments] = await Promise.all([
      this.prisma.purchase.findMany({
        where: {
          companyId,
          status: 'POSTED',
          purchaseDate: { gte: range.gte, lte: range.lte },
          ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
        },
        select: {
          grandTotal: true,
          lineDiscountTotal: true,
          invoiceDiscount: true,
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
          cessAmount: true,
          otherTaxAmount: true,
          amountPaid: true,
        },
      }),
      this.prisma.purchaseReturn.aggregate({
        where: {
          companyId,
          status: 'POSTED',
          returnDate: { gte: range.gte, lte: range.lte },
          ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
        },
        _sum: { grandTotal: true },
      }),
      this.prisma.paymentMade.aggregate({
        where: {
          companyId,
          status: 'POSTED',
          paymentDate: { gte: range.gte, lte: range.lte },
          ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
        },
        _sum: { amount: true },
      }),
    ]);

    const grossPurchases = roundCurrency(purchases.reduce((s, p) => s + p.grandTotal, 0));
    const lineDiscountTotal = roundCurrency(purchases.reduce((s, p) => s + p.lineDiscountTotal, 0));
    const invoiceDiscountTotal = roundCurrency(purchases.reduce((s, p) => s + p.invoiceDiscount, 0));
    const purchaseReturns = roundCurrency(returns._sum.grandTotal ?? 0);
    const netPurchases = roundCurrency(grossPurchases - purchaseReturns);
    const totalPaymentsMade = roundCurrency(payments._sum.amount ?? 0);
    const cgstAmount = roundCurrency(purchases.reduce((s, p) => s + p.cgstAmount, 0));
    const sgstAmount = roundCurrency(purchases.reduce((s, p) => s + p.sgstAmount, 0));
    const igstAmount = roundCurrency(purchases.reduce((s, p) => s + p.igstAmount, 0));
    const cessAmount = roundCurrency(purchases.reduce((s, p) => s + p.cessAmount, 0));
    const totalTax = roundCurrency(
      purchases.reduce((s, p) => s + p.cgstAmount + p.sgstAmount + p.igstAmount + p.cessAmount + p.otherTaxAmount, 0),
    );

    // Outstanding = posted net purchases - all payments ever made (current payable per supplier)
    const allPayableSuppliers = await this.prisma.supplier.aggregate({
      where: { companyId, currentBalance: { gt: 0 } },
      _sum: { currentBalance: true },
    });
    const totalOutstanding = roundCurrency(allPayableSuppliers._sum.currentBalance ?? 0);

    return {
      invoiceCount: purchases.length,
      grossPurchases,
      lineDiscountTotal,
      invoiceDiscountTotal,
      totalDiscounts: roundCurrency(lineDiscountTotal + invoiceDiscountTotal),
      purchaseReturns,
      netPurchases,
      totalTax,
      cgstAmount,
      sgstAmount,
      igstAmount,
      cessAmount,
      totalPaymentsMade,
      totalOutstanding,
      averageInvoiceValue: roundCurrency(safeDivide(grossPurchases, purchases.length)),
      startDate: range.startDateStr,
      endDate: range.endDateStr,
    };
  }

  // ── Purchase Invoice List ────────────────────────────────────────────────────

  public async getPurchaseInvoiceList(
    companyId: string,
    filters: PurchaseReportFilters = {},
  ): Promise<PaginatedResult<PurchaseInvoiceReportRow>> {
    const range = resolveDateRange(filters);
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(200, Math.max(10, filters.pageSize ?? 50));
    const skip = (page - 1) * pageSize;

    const where = {
      companyId,
      status: filters.status ?? 'POSTED',
      purchaseDate: { gte: range.gte, lte: range.lte },
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    };

    const [total, purchases] = await Promise.all([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { purchaseDate: 'desc' },
        select: {
          id: true,
          purchaseNumber: true,
          purchaseDate: true,
          supplier: { select: { name: true } },
          subtotal: true,
          lineDiscountTotal: true,
          invoiceDiscount: true,
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
          cessAmount: true,
          otherTaxAmount: true,
          grandTotal: true,
          amountPaid: true,
          paymentStatus: true,
          status: true,
        },
      }),
    ]);

    const rows: PurchaseInvoiceReportRow[] = purchases.map((p) => ({
      id: p.id,
      purchaseNumber: p.purchaseNumber,
      purchaseDate: p.purchaseDate,
      supplierName: p.supplier.name,
      subtotal: p.subtotal,
      lineDiscountTotal: p.lineDiscountTotal,
      invoiceDiscount: p.invoiceDiscount,
      taxAmount: roundCurrency(p.cgstAmount + p.sgstAmount + p.igstAmount + p.cessAmount + p.otherTaxAmount),
      grandTotal: p.grandTotal,
      amountPaid: p.amountPaid,
      outstanding: roundCurrency(p.grandTotal - p.amountPaid),
      paymentStatus: p.paymentStatus,
      status: p.status,
    }));

    return { items: rows, data: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ── Product Purchase Report ──────────────────────────────────────────────────

  public async getProductPurchaseReport(
    companyId: string,
    filters: PurchaseReportFilters = {},
  ): Promise<ProductPurchaseReportRow[]> {
    const range = resolveDateRange(filters);

    const [purchaseItems, returnItems] = await Promise.all([
      this.prisma.purchaseItem.findMany({
        where: {
          purchase: {
            companyId,
            status: 'POSTED',
            purchaseDate: { gte: range.gte, lte: range.lte },
            ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
          },
          ...(filters.productId ? { productId: filters.productId } : {}),
        },
        select: {
          productId: true,
          productNameSnapshot: true,
          skuSnapshot: true,
          quantity: true,
          freeQuantity: true,
          lineTotal: true,
          discountAmount: true,
          purchaseRate: true,
        },
      }),
      this.prisma.purchaseReturnItem.findMany({
        where: {
          purchaseReturn: {
            companyId,
            status: 'POSTED',
            returnDate: { gte: range.gte, lte: range.lte },
          },
          ...(filters.productId ? { productId: filters.productId } : {}),
        },
        select: { productId: true, quantity: true, lineTotal: true },
      }),
    ]);

    const returnMap = new Map<string, { qty: number; amount: number }>();
    for (const r of returnItems) {
      const ex = returnMap.get(r.productId) ?? { qty: 0, amount: 0 };
      returnMap.set(r.productId, { qty: ex.qty + r.quantity, amount: ex.amount + r.lineTotal });
    }

    const productMap = new Map<string, {
      name: string; sku: string | null;
      qty: number; totalValue: number; discountAmount: number;
      totalRate: number; rateCount: number;
    }>();

    for (const item of purchaseItems) {
      const ex = productMap.get(item.productId) ?? {
        name: item.productNameSnapshot, sku: item.skuSnapshot ?? null,
        qty: 0, totalValue: 0, discountAmount: 0, totalRate: 0, rateCount: 0,
      };
      ex.qty += item.quantity;
      ex.totalValue += item.lineTotal;
      ex.discountAmount += item.discountAmount;
      if (item.purchaseRate > 0) { ex.totalRate += item.purchaseRate; ex.rateCount++; }
      productMap.set(item.productId, ex);
    }

    return Array.from(productMap.entries()).map(([productId, data]) => {
      const ret = returnMap.get(productId) ?? { qty: 0, amount: 0 };
      return {
        productId,
        productName: data.name,
        sku: data.sku,
        quantityPurchased: data.qty,
        returnQuantity: ret.qty,
        netQuantityReceived: data.qty - ret.qty,
        grossPurchaseValue: roundCurrency(data.totalValue),
        discountAmount: roundCurrency(data.discountAmount),
        netPurchaseValue: roundCurrency(data.totalValue - ret.amount),
        avgUnitCost: data.rateCount > 0 ? roundCurrency(safeDivide(data.totalRate, data.rateCount)) : null,
      };
    }).sort((a, b) => b.netPurchaseValue - a.netPurchaseValue);
  }

  // ── Supplier Report ──────────────────────────────────────────────────────────

  public async getSupplierReport(
    companyId: string,
    filters: PurchaseReportFilters = {},
  ): Promise<SupplierReportRow[]> {
    const range = resolveDateRange(filters);

    const [purchases, returns, payments, suppliers] = await Promise.all([
      this.prisma.purchase.groupBy({
        by: ['supplierId'],
        where: { companyId, status: 'POSTED', purchaseDate: { gte: range.gte, lte: range.lte } },
        _sum: { grandTotal: true }, _count: true,
      }),
      this.prisma.purchaseReturn.groupBy({
        by: ['supplierId'],
        where: { companyId, status: 'POSTED', returnDate: { gte: range.gte, lte: range.lte } },
        _sum: { grandTotal: true },
      }),
      this.prisma.paymentMade.groupBy({
        by: ['supplierId'],
        where: { companyId, status: 'POSTED', paymentDate: { gte: range.gte, lte: range.lte } },
        _sum: { amount: true },
      }),
      this.prisma.supplier.findMany({
        where: { companyId },
        select: { id: true, name: true, currentBalance: true },
      }),
    ]);

    const returnMap = new Map(returns.map((r) => [r.supplierId, r._sum.grandTotal ?? 0]));
    const paymentMap = new Map(payments.map((p) => [p.supplierId, p._sum.amount ?? 0]));
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    return purchases.map((p) => {
      const sup = supplierMap.get(p.supplierId);
      const gross = roundCurrency(p._sum.grandTotal ?? 0);
      const ret = roundCurrency(returnMap.get(p.supplierId) ?? 0);
      const paid = roundCurrency(paymentMap.get(p.supplierId) ?? 0);
      return {
        supplierId: p.supplierId,
        supplierName: sup?.name ?? p.supplierId,
        purchaseCount: p._count,
        grossPurchases: gross,
        purchaseReturns: ret,
        netPurchases: roundCurrency(gross - ret),
        paymentsMade: paid,
        outstandingBalance: roundCurrency(sup?.currentBalance ?? 0),
      };
    }).sort((a, b) => b.grossPurchases - a.grossPurchases);
  }
}
