import { PrismaClient } from '@prisma/client';
import {
  TaxReportFilters,
  TaxSummaryReport,
  TaxRateBreakdown,
} from '@rs-inventory/types';
import {
  resolveDateRange,
  roundCurrency,
} from '../repositories/reporting.repository.js';

export class TaxReportService {
  constructor(private readonly prisma: PrismaClient) {}

  public async getTaxSummary(
    companyId: string,
    filters: TaxReportFilters = {},
  ): Promise<TaxSummaryReport> {
    const range = resolveDateRange(filters);

    const [salesInvoices, salesReturns, purchases, purchaseReturns, salesItems, purchaseItems] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: { companyId, status: 'POSTED', invoiceDate: { gte: range.gte, lte: range.lte } },
        select: {
          subtotal: true,
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
          cessAmount: true,
        },
      }),
      this.prisma.salesReturn.findMany({
        where: { companyId, status: 'POSTED', returnDate: { gte: range.gte, lte: range.lte } },
        select: { cgstAmount: true, sgstAmount: true, igstAmount: true, cessAmount: true },
      }),
      this.prisma.purchase.findMany({
        where: { companyId, status: 'POSTED', purchaseDate: { gte: range.gte, lte: range.lte } },
        select: {
          subtotal: true,
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
          cessAmount: true,
        },
      }),
      this.prisma.purchaseReturn.findMany({
        where: { companyId, status: 'POSTED', returnDate: { gte: range.gte, lte: range.lte } },
        select: { cgstAmount: true, sgstAmount: true, igstAmount: true, cessAmount: true },
      }),
      this.prisma.salesInvoiceItem.findMany({
        where: {
          salesInvoice: { companyId, status: 'POSTED', invoiceDate: { gte: range.gte, lte: range.lte } },
        },
        select: {
          taxableAmount: true,
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
          cessAmount: true,
          taxRate: true,
        },
      }),
      this.prisma.purchaseItem.findMany({
        where: {
          purchase: { companyId, status: 'POSTED', purchaseDate: { gte: range.gte, lte: range.lte } },
        },
        select: {
          taxableAmount: true,
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
          cessAmount: true,
          taxRate: true,
        },
      }),
    ]);

    // ── Sales Tax Totals ──────────────────────────────────────────────────────

    const taxableSales = roundCurrency(salesInvoices.reduce((s, i) => s + i.subtotal, 0));
    const salesCGST = roundCurrency(salesInvoices.reduce((s, i) => s + i.cgstAmount, 0));
    const salesSGST = roundCurrency(salesInvoices.reduce((s, i) => s + i.sgstAmount, 0));
    const salesIGST = roundCurrency(salesInvoices.reduce((s, i) => s + i.igstAmount, 0));
    const salesCess = roundCurrency(salesInvoices.reduce((s, i) => s + i.cessAmount, 0));
    const totalSalesTax = roundCurrency(salesCGST + salesSGST + salesIGST + salesCess);

    const salesReturnTaxReversal = roundCurrency(
      salesReturns.reduce((s, r) => s + r.cgstAmount + r.sgstAmount + r.igstAmount + r.cessAmount, 0),
    );
    const netSalesTax = roundCurrency(totalSalesTax - salesReturnTaxReversal);

    // ── Purchase Tax Totals ───────────────────────────────────────────────────

    const taxablePurchases = roundCurrency(purchases.reduce((s, p) => s + p.subtotal, 0));
    const purchaseCGST = roundCurrency(purchases.reduce((s, p) => s + p.cgstAmount, 0));
    const purchaseSGST = roundCurrency(purchases.reduce((s, p) => s + p.sgstAmount, 0));
    const purchaseIGST = roundCurrency(purchases.reduce((s, p) => s + p.igstAmount, 0));
    const purchaseCess = roundCurrency(purchases.reduce((s, p) => s + p.cessAmount, 0));
    const totalPurchaseTax = roundCurrency(purchaseCGST + purchaseSGST + purchaseIGST + purchaseCess);

    const purchaseReturnTaxReversal = roundCurrency(
      purchaseReturns.reduce(
        (s, r) => s + r.cgstAmount + r.sgstAmount + r.igstAmount + r.cessAmount, 0,
      ),
    );
    const netPurchaseTax = roundCurrency(totalPurchaseTax - purchaseReturnTaxReversal);

    // ── Net Tax Liability ─────────────────────────────────────────────────────

    const netTaxLiability = roundCurrency(netSalesTax - netPurchaseTax);

    // ── Rate Breakdowns ───────────────────────────────────────────────────────

    const buildRateBreakdown = (
      rows: { taxableAmount: number; cgstAmount: number; sgstAmount: number; igstAmount: number; cessAmount: number; taxRate: number }[],
    ): TaxRateBreakdown[] => {
      const rateMap = new Map<number, TaxRateBreakdown>();
      for (const row of rows) {
        const rate = row.taxRate ?? 0;
        if (filters.taxRate !== undefined && filters.taxRate !== rate) continue;
        const ex = rateMap.get(rate) ?? {
          taxRate: rate,
          taxableAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          cessAmount: 0,
          totalTax: 0,
          invoiceCount: 0,
        };
        ex.taxableAmount += row.taxableAmount;
        ex.cgstAmount += row.cgstAmount;
        ex.sgstAmount += row.sgstAmount;
        ex.igstAmount += row.igstAmount;
        ex.cessAmount += row.cessAmount;
        ex.totalTax += row.cgstAmount + row.sgstAmount + row.igstAmount + row.cessAmount;
        ex.invoiceCount++;
        rateMap.set(rate, ex);
      }
      return Array.from(rateMap.values())
        .map((r) => ({
          taxRate: r.taxRate,
          taxableAmount: roundCurrency(r.taxableAmount),
          cgstAmount: roundCurrency(r.cgstAmount),
          sgstAmount: roundCurrency(r.sgstAmount),
          igstAmount: roundCurrency(r.igstAmount),
          cessAmount: roundCurrency(r.cessAmount),
          totalTax: roundCurrency(r.totalTax),
          invoiceCount: r.invoiceCount,
        }))
        .sort((a, b) => a.taxRate - b.taxRate);
    };

    return {
      taxableSales,
      salesCGST,
      salesSGST,
      salesIGST,
      salesCess,
      totalSalesTax,
      salesReturnTaxReversal,
      netSalesTax,
      taxablePurchases,
      purchaseCGST,
      purchaseSGST,
      purchaseIGST,
      purchaseCess,
      totalPurchaseTax,
      purchaseReturnTaxReversal,
      netPurchaseTax,
      netTaxLiability,
      salesByRate: buildRateBreakdown(salesItems),
      purchasesByRate: buildRateBreakdown(purchaseItems),
      startDate: range.startDateStr,
      endDate: range.endDateStr,
      disclaimer:
        'This is a management summary for reference only. It is not a substitute for formal ' +
        'GSTR-1, GSTR-3B, or other statutory GST return filings. Consult a qualified tax ' +
        'professional or chartered accountant for compliance purposes.',
    };
  }
}
