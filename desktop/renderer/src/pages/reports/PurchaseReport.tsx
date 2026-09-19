import React, { useState, useEffect, useCallback } from 'react';
import {
  DateRangeFilter,
  KpiCard,
  ReportSection,
  ReportTable,
  LoadingSpinner,
  ErrorState,
  formatCurrency,
  formatNumber,
  formatDate,
  Pagination,
  usePagination,
  ReportPeriod,
} from './report-utils';
import { ShoppingCart, Tag, CreditCard, Truck, Package } from 'lucide-react';

type PurchaseTab = 'summary' | 'invoices' | 'products' | 'suppliers';

const TABS: { id: PurchaseTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'invoices', label: 'Invoice List' },
  { id: 'products', label: 'Products' },
  { id: 'suppliers', label: 'Suppliers' },
];

export const PurchaseReport: React.FC = () => {
  const [tab, setTab] = useState<PurchaseTab>('summary');
  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [summary, setSummary] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invPage, setInvPage] = useState(1);
  const [invTotalPages, setInvTotalPages] = useState(1);
  const [invTotal, setInvTotal] = useState(0);

  const productPag = usePagination(products, 25);
  const supplierPag = usePagination(suppliers, 25);

  const getFilters = () => ({
    period,
    ...(period === 'custom' ? { startDate, endDate } : {}),
    page: tab === 'invoices' ? invPage : 1,
    pageSize: 25,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filters = getFilters();
    try {
      if (tab === 'summary') {
        const res = await window.rsInventory.getPurchaseReportSummary(filters);
        if (res.success) setSummary(res.data);
        else setError(res.error?.message ?? 'Error');
      } else if (tab === 'invoices') {
        const res = await window.rsInventory.getPurchaseInvoiceReportList(filters);
        if (res.success && res.data) {
          setInvoices(res.data.items ?? (res.data as any).data ?? []);
          setInvTotalPages(res.data.totalPages);
          setInvTotal(res.data.total);
        }
      } else if (tab === 'products') {
        const res = await window.rsInventory.getProductPurchaseReport(filters);
        if (res.success) setProducts(res.data ?? []);
      } else if (tab === 'suppliers') {
        const res = await window.rsInventory.getSupplierReport(filters);
        if (res.success) setSuppliers(res.data ?? []);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [tab, period, startDate, endDate, invPage]);

  useEffect(() => {
    if (period !== 'custom') load();
  }, [tab, period, invPage]);

  const renderContent = () => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorState message={error} onRetry={load} />;

    if (tab === 'summary' && summary) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              label="Gross Purchases"
              value={formatCurrency(summary.grossPurchases)}
              sub={`${summary.invoiceCount} invoices`}
              icon={<ShoppingCart className="h-4 w-4" />}
              iconBg="bg-violet-500/10 border-violet-500/20 text-violet-400"
            />
            <KpiCard
              label="Net Purchases"
              value={formatCurrency(summary.netPurchases)}
              sub={`Returns: ${formatCurrency(summary.purchaseReturns)}`}
              icon={<Package className="h-4 w-4" />}
              iconBg="bg-brand-500/10 border-brand-500/20 text-brand-400"
            />
            <KpiCard
              label="Total Discounts"
              value={formatCurrency(summary.totalDiscounts)}
              sub={`Avg invoice: ${formatCurrency(summary.averageInvoiceValue)}`}
              icon={<Tag className="h-4 w-4" />}
              iconBg="bg-amber-500/10 border-amber-500/20 text-amber-400"
            />
            <KpiCard
              label="Total Tax (Input)"
              value={formatCurrency(summary.totalTax)}
              sub={`Payments made: ${formatCurrency(summary.totalPaymentsMade)}`}
              icon={<CreditCard className="h-4 w-4" />}
              iconBg="bg-rose-500/10 border-rose-500/20 text-rose-400"
            />
          </div>

          <ReportSection title="GST Input Tax Breakdown">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: 'CGST', val: summary.cgstAmount },
                { label: 'SGST', val: summary.sgstAmount },
                { label: 'IGST', val: summary.igstAmount },
                { label: 'Cess', val: summary.cessAmount },
              ].map((t) => (
                <div key={t.label} className="bg-surface-800/60 border border-surface-700 rounded-xl px-4 py-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t.label}</div>
                  <div className="text-base font-bold text-white mt-1">{formatCurrency(t.val)}</div>
                </div>
              ))}
            </div>
          </ReportSection>

          <ReportSection title="Payables Summary">
            <div className="flex items-center gap-6 bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
              <Truck className="h-8 w-8 text-rose-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Outstanding Payables</div>
                <div className="text-2xl font-bold text-rose-400">{formatCurrency(summary.totalOutstanding)}</div>
                <div className="text-xs text-slate-500 mt-1">Across all suppliers as of today</div>
              </div>
            </div>
          </ReportSection>
        </div>
      );
    }

    if (tab === 'invoices') {
      return (
        <ReportSection title="Purchase Invoices" subtitle={`${invTotal.toLocaleString()} records`}>
          <ReportTable
            headers={['Bill #', 'Date', 'Supplier', 'Subtotal', 'Tax', 'Grand Total', 'Paid', 'Outstanding', 'Status']}
            rows={invoices.map((inv: any) => [
              <span className="font-mono text-brand-400">{inv.purchaseNumber}</span>,
              formatDate(inv.purchaseDate),
              inv.supplierName,
              formatCurrency(inv.subtotal),
              formatCurrency(inv.taxAmount),
              <span className="font-semibold text-white">{formatCurrency(inv.grandTotal)}</span>,
              <span className="text-emerald-400">{formatCurrency(inv.amountPaid)}</span>,
              inv.outstanding > 0.01 ? <span className="text-rose-400">{formatCurrency(inv.outstanding)}</span> : '—',
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${inv.paymentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : inv.paymentStatus === 'PARTIAL' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {inv.paymentStatus}
              </span>,
            ])}
          />
          <Pagination page={invPage} totalPages={invTotalPages} total={invTotal} onPage={setInvPage} />
        </ReportSection>
      );
    }

    if (tab === 'products') {
      return (
        <ReportSection title="Product Purchases" subtitle={`${products.length} products`}>
          <ReportTable
            headers={['Product', 'SKU', 'Qty Purchased', 'Returns', 'Net Qty', 'Gross Value', 'Discounts', 'Net Value', 'Avg Unit Cost']}
            rows={productPag.paginated.map((p: any) => [
              <span className="font-medium text-slate-200">{p.productName}</span>,
              <span className="text-slate-500 font-mono text-[10px]">{p.sku ?? '—'}</span>,
              formatNumber(p.quantityPurchased, 0),
              p.returnQuantity > 0 ? <span className="text-rose-400">-{p.returnQuantity}</span> : '—',
              formatNumber(p.netQuantityReceived, 0),
              formatCurrency(p.grossPurchaseValue),
              p.discountAmount > 0 ? <span className="text-amber-400">{formatCurrency(p.discountAmount)}</span> : '—',
              <span className="font-semibold text-white">{formatCurrency(p.netPurchaseValue)}</span>,
              p.avgUnitCost !== null ? formatCurrency(p.avgUnitCost) : '—',
            ])}
          />
          <Pagination page={productPag.page} totalPages={productPag.totalPages} total={products.length} onPage={productPag.setPage} />
        </ReportSection>
      );
    }

    if (tab === 'suppliers') {
      return (
        <ReportSection title="Supplier Summary" subtitle={`${suppliers.length} suppliers`}>
          <ReportTable
            headers={['Supplier', 'Invoices', 'Gross Purchases', 'Returns', 'Net Purchases', 'Payments Made', 'Outstanding']}
            rows={supplierPag.paginated.map((s: any) => [
              <span className="font-medium text-slate-200">{s.supplierName}</span>,
              s.purchaseCount,
              formatCurrency(s.grossPurchases),
              s.purchaseReturns > 0 ? <span className="text-rose-400">{formatCurrency(s.purchaseReturns)}</span> : '—',
              <span className="font-semibold text-white">{formatCurrency(s.netPurchases)}</span>,
              <span className="text-emerald-400">{formatCurrency(s.paymentsMade)}</span>,
              s.outstandingBalance > 0.01 ? (
                <span className="text-rose-400 font-semibold">{formatCurrency(s.outstandingBalance)}</span>
              ) : '—',
            ])}
          />
          <Pagination page={supplierPag.page} totalPages={supplierPag.totalPages} total={suppliers.length} onPage={supplierPag.setPage} />
        </ReportSection>
      );
    }

    return null;
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-surface-900 border border-surface-700 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <DateRangeFilter
          period={period}
          startDate={startDate}
          endDate={endDate}
          onPeriodChange={setPeriod}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApply={load}
          loading={loading}
        />
      </div>
      {renderContent()}
    </div>
  );
};
