import { PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  SalesReportFilters,
  SalesReportSummary,
  SalesInvoiceReportRow,
  ProductSalesReportRow,
  CategorySalesReportRow,
  CustomerSalesReportRow,
  PaymentCollectionRow,
} from '@rs-inventory/types';
import {
  resolveDateRange,
  roundCurrency,
  safeDivide,
  roundPercent,
} from '../repositories/reporting.repository.js';

export class SalesReportService {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Sales Summary ────────────────────────────────────────────────────────────

  public async getSalesSummary(
    companyId: string,
    filters: SalesReportFilters = {},
  ): Promise<SalesReportSummary> {
    const range = resolveDateRange(filters);

    const [invoices, returns, payments] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: {
          companyId,
          status: 'POSTED',
          invoiceDate: { gte: range.gte, lte: range.lte },
          ...(filters.customerId ? { customerId: filters.customerId } : {}),
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
      this.prisma.salesReturn.aggregate({
        where: {
          companyId,
          status: 'POSTED',
          returnDate: { gte: range.gte, lte: range.lte },
        },
        _sum: { grandTotal: true },
        _count: true,
      }),
      this.prisma.salesPayment.groupBy({
        by: ['paymentMode'],
        where: {
          companyId,
          status: 'POSTED',
          paymentDate: { gte: range.gte, lte: range.lte },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const grossSales = roundCurrency(invoices.reduce((s, i) => s + i.grandTotal, 0));
    const lineDiscountTotal = roundCurrency(invoices.reduce((s, i) => s + i.lineDiscountTotal, 0));
    const invoiceDiscountTotal = roundCurrency(invoices.reduce((s, i) => s + i.invoiceDiscount, 0));
    const salesReturns = roundCurrency(returns._sum.grandTotal ?? 0);
    const netSales = roundCurrency(grossSales - salesReturns);
    const cgstAmount = roundCurrency(invoices.reduce((s, i) => s + i.cgstAmount, 0));
    const sgstAmount = roundCurrency(invoices.reduce((s, i) => s + i.sgstAmount, 0));
    const igstAmount = roundCurrency(invoices.reduce((s, i) => s + i.igstAmount, 0));
    const cessAmount = roundCurrency(invoices.reduce((s, i) => s + i.cessAmount, 0));
    const totalTax = roundCurrency(
      invoices.reduce((s, i) => s + i.cgstAmount + i.sgstAmount + i.igstAmount + i.cessAmount + i.otherTaxAmount, 0),
    );

    const salesByPaymentMethod = payments.map((p) => ({
      method: p.paymentMode,
      amount: roundCurrency(p._sum.amount ?? 0),
      count: p._count,
    }));

    return {
      invoiceCount: invoices.length,
      grossSales,
      lineDiscountTotal,
      invoiceDiscountTotal,
      totalDiscounts: roundCurrency(lineDiscountTotal + invoiceDiscountTotal),
      salesReturns,
      netSales,
      totalTax,
      cgstAmount,
      sgstAmount,
      igstAmount,
      cessAmount,
      averageInvoiceValue: roundCurrency(safeDivide(grossSales, invoices.length)),
      salesByPaymentMethod,
      returnCount: returns._count,
      startDate: range.startDateStr,
      endDate: range.endDateStr,
    };
  }

  // ── Sales Invoice List ───────────────────────────────────────────────────────

  public async getSalesInvoiceList(
    companyId: string,
    filters: SalesReportFilters = {},
  ): Promise<PaginatedResult<SalesInvoiceReportRow>> {
    const range = resolveDateRange(filters);
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(200, Math.max(10, filters.pageSize ?? 50));
    const skip = (page - 1) * pageSize;

    const where = {
      companyId,
      status: filters.status ?? 'POSTED',
      invoiceDate: { gte: range.gte, lte: range.lte },
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
    };

    const [total, invoices] = await Promise.all([
      this.prisma.salesInvoice.count({ where }),
      this.prisma.salesInvoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { invoiceDate: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          customerNameSnapshot: true,
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

    const rows: SalesInvoiceReportRow[] = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customerName: inv.customerNameSnapshot,
      subtotal: inv.subtotal,
      lineDiscountTotal: inv.lineDiscountTotal,
      invoiceDiscount: inv.invoiceDiscount,
      taxAmount: roundCurrency(inv.cgstAmount + inv.sgstAmount + inv.igstAmount + inv.cessAmount + inv.otherTaxAmount),
      grandTotal: inv.grandTotal,
      amountPaid: inv.amountPaid,
      outstanding: roundCurrency(inv.grandTotal - inv.amountPaid),
      paymentStatus: inv.paymentStatus,
      status: inv.status,
    }));

    return {
      items: rows,
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ── Product Sales Report ─────────────────────────────────────────────────────

  public async getProductSalesReport(
    companyId: string,
    filters: SalesReportFilters = {},
  ): Promise<ProductSalesReportRow[]> {
    const range = resolveDateRange(filters);

    // Aggregate sales items from POSTED invoices in range
    const salesItems = await this.prisma.salesInvoiceItem.findMany({
      where: {
        salesInvoice: {
          companyId,
          status: 'POSTED',
          invoiceDate: { gte: range.gte, lte: range.lte },
        },
        ...(filters.productId ? { productId: filters.productId } : {}),
        ...(filters.categoryId
          ? { product: { categoryId: filters.categoryId } }
          : {}),
      },
      select: {
        productId: true,
        productNameSnapshot: true,
        skuSnapshot: true,
        barcodeSnapshot: true,
        quantity: true,
        lineTotal: true,
        discountAmount: true,
        unitCostSnapshot: true,
        product: { select: { sku: true, barcode: true } },
      },
    });

    // Aggregate return items from POSTED returns in range
    const returnItems = await this.prisma.salesReturnItem.findMany({
      where: {
        salesReturn: {
          companyId,
          status: 'POSTED',
          returnDate: { gte: range.gte, lte: range.lte },
        },
        ...(filters.productId ? { productId: filters.productId } : {}),
      },
      select: { productId: true, quantity: true, lineTotal: true },
    });

    const returnMap = new Map<string, { qty: number; amount: number }>();
    for (const r of returnItems) {
      const existing = returnMap.get(r.productId) ?? { qty: 0, amount: 0 };
      returnMap.set(r.productId, {
        qty: existing.qty + r.quantity,
        amount: existing.amount + r.lineTotal,
      });
    }

    const productMap = new Map<
      string,
      {
        productName: string;
        sku: string | null;
        barcode: string | null;
        qtySold: number;
        grossSales: number;
        discountAmount: number;
        cogsSold: number;
        hasCost: boolean;
        missingCostUnits: number;
      }
    >();

    for (const item of salesItems) {
      const existing = productMap.get(item.productId) ?? {
        productName: item.productNameSnapshot,
        sku: item.skuSnapshot ?? item.product?.sku ?? null,
        barcode: item.barcodeSnapshot ?? item.product?.barcode ?? null,
        qtySold: 0,
        grossSales: 0,
        discountAmount: 0,
        cogsSold: 0,
        hasCost: true,
        missingCostUnits: 0,
      };

      const hasCostItem = item.unitCostSnapshot > 0;
      existing.qtySold += item.quantity;
      existing.grossSales += item.lineTotal;
      existing.discountAmount += item.discountAmount;
      if (hasCostItem) {
        existing.cogsSold += item.unitCostSnapshot * item.quantity;
      } else {
        existing.missingCostUnits += item.quantity;
      }
      if (!hasCostItem) existing.hasCost = false;
      productMap.set(item.productId, existing);
    }

    const rows: ProductSalesReportRow[] = [];
    for (const [productId, data] of productMap) {
      const ret = returnMap.get(productId) ?? { qty: 0, amount: 0 };
      const netQty = data.qtySold - ret.qty;
      const netSales = roundCurrency(data.grossSales - ret.amount);
      const hasCostData = data.cogsSold > 0;
      const grossProfit = hasCostData ? roundCurrency(netSales - data.cogsSold) : null;
      const grossProfitMargin = hasCostData && netSales > 0
        ? roundPercent(safeDivide(grossProfit ?? 0, netSales) * 100)
        : null;

      rows.push({
        productId,
        productName: data.productName,
        sku: data.sku,
        barcode: data.barcode,
        quantitySold: data.qtySold,
        returnedQuantity: ret.qty,
        netQuantitySold: netQty,
        grossSales: roundCurrency(data.grossSales),
        discountAmount: roundCurrency(data.discountAmount),
        netSales,
        cogsSold: hasCostData ? roundCurrency(data.cogsSold) : null,
        grossProfit,
        grossProfitMargin,
        hasCostData,
      });
    }

    return rows.sort((a, b) => b.netSales - a.netSales);
  }

  // ── Category Sales Report ────────────────────────────────────────────────────

  public async getCategorySalesReport(
    companyId: string,
    filters: SalesReportFilters = {},
  ): Promise<CategorySalesReportRow[]> {
    const range = resolveDateRange(filters);

    const items = await this.prisma.salesInvoiceItem.findMany({
      where: {
        salesInvoice: {
          companyId,
          status: 'POSTED',
          invoiceDate: { gte: range.gte, lte: range.lte },
        },
      },
      select: {
        quantity: true,
        lineTotal: true,
        product: {
          select: {
            categoryId: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const catMap = new Map<string, { name: string; qty: number; sales: number }>();
    for (const item of items) {
      const catId = item.product?.categoryId ?? '__uncategorised__';
      const catName = item.product?.category?.name ?? 'Uncategorised';
      const existing = catMap.get(catId) ?? { name: catName, qty: 0, sales: 0 };
      existing.qty += item.quantity;
      existing.sales += item.lineTotal;
      catMap.set(catId, existing);
    }

    const totalSales = Array.from(catMap.values()).reduce((s, c) => s + c.sales, 0);

    return Array.from(catMap.entries())
      .map(([catId, data]) => ({
        categoryId: catId === '__uncategorised__' ? null : catId,
        categoryName: data.name,
        quantitySold: data.qty,
        netSales: roundCurrency(data.sales),
        sharePercent: roundPercent(safeDivide(data.sales, totalSales) * 100),
      }))
      .sort((a, b) => b.netSales - a.netSales);
  }

  // ── Customer Sales Report ────────────────────────────────────────────────────

  public async getCustomerSalesReport(
    companyId: string,
    filters: SalesReportFilters = {},
  ): Promise<CustomerSalesReportRow[]> {
    const range = resolveDateRange(filters);

    const [invoices, returns, payments] = await Promise.all([
      this.prisma.salesInvoice.groupBy({
        by: ['customerId', 'customerNameSnapshot'],
        where: {
          companyId,
          status: 'POSTED',
          invoiceDate: { gte: range.gte, lte: range.lte },
        },
        _sum: { grandTotal: true },
        _count: true,
      }),
      this.prisma.salesReturn.groupBy({
        by: ['customerId'],
        where: {
          companyId,
          status: 'POSTED',
          returnDate: { gte: range.gte, lte: range.lte },
        },
        _sum: { grandTotal: true },
      }),
      this.prisma.salesPayment.groupBy({
        by: ['customerId'],
        where: {
          companyId,
          status: 'POSTED',
          paymentDate: { gte: range.gte, lte: range.lte },
        },
        _sum: { amount: true },
      }),
    ]);

    const returnMap = new Map(returns.map((r) => [r.customerId, r._sum.grandTotal ?? 0]));
    const paymentMap = new Map(payments.map((p) => [p.customerId, p._sum.amount ?? 0]));

    // Get current balances from Customer table
    const customerIds = invoices.map((i) => i.customerId).filter(Boolean) as string[];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, companyId },
      select: { id: true, currentBalance: true },
    });
    const balanceMap = new Map(customers.map((c) => [c.id, c.currentBalance]));

    return invoices.map((inv) => {
      const cid = inv.customerId;
      const gross = roundCurrency(inv._sum.grandTotal ?? 0);
      const ret = roundCurrency(returnMap.get(cid ?? '') ?? 0);
      const paid = roundCurrency(paymentMap.get(cid ?? '') ?? 0);
      return {
        customerId: cid,
        customerName: inv.customerNameSnapshot ?? 'Walk-in Customer',
        invoiceCount: inv._count,
        grossSales: gross,
        salesReturns: ret,
        netSales: roundCurrency(gross - ret),
        paymentsReceived: paid,
        outstandingBalance: roundCurrency(balanceMap.get(cid ?? '') ?? 0),
      };
    }).sort((a, b) => b.grossSales - a.grossSales);
  }

  // ── Payment Collection Report ────────────────────────────────────────────────

  public async getPaymentCollections(
    companyId: string,
    filters: SalesReportFilters = {},
  ): Promise<PaginatedResult<PaymentCollectionRow>> {
    const range = resolveDateRange(filters);
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(200, Math.max(10, filters.pageSize ?? 50));
    const skip = (page - 1) * pageSize;

    const where = {
      companyId,
      status: 'POSTED',
      paymentDate: { gte: range.gte, lte: range.lte },
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.paymentMode ? { paymentMode: filters.paymentMode } : {}),
    };

    const [total, payments] = await Promise.all([
      this.prisma.salesPayment.count({ where }),
      this.prisma.salesPayment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { paymentDate: 'desc' },
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          paymentMode: true,
          amount: true,
          referenceNo: true,
          notes: true,
          customer: { select: { name: true } },
          salesInvoice: { select: { invoiceNumber: true } },
        },
      }),
    ]);

    const rows: PaymentCollectionRow[] = payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      paymentDate: p.paymentDate,
      customerName: p.customer?.name ?? null,
      invoiceNumber: p.salesInvoice?.invoiceNumber ?? null,
      paymentMode: p.paymentMode,
      amount: roundCurrency(p.amount),
      referenceNo: p.referenceNo,
      notes: p.notes,
    }));

    return {
      items: rows,
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
