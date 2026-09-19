import React, { useState, useEffect, useCallback } from 'react';
import {
  DateRangeFilter,
  KpiCard,
  ReportSection,
  ReportTable,
  LoadingSpinner,
  ErrorState,
  AlertBanner,
  formatCurrency,
  formatNumber,
  formatDate,
  Pagination,
  usePagination,
  ReportPeriod,
} from './report-utils';
import { TrendingUp, Receipt, CreditCard, Tag } from 'lucide-react';

type SalesTab = 'summary' | 'invoices' | 'products' | 'categories' | 'customers' | 'payments';

const TABS: { id: SalesTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'invoices', label: 'Invoice List' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'customers', label: 'Customers' },
  { id: 'payments', label: 'Collections' },
];

export const SalesReport: React.FC = () => {
  const [tab, setTab] = useState<SalesTab>('summary');
  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [summary, setSummary] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state for invoice list and payments
  const [invPage, setInvPage] = useState(1);
  const [invTotalPages, setInvTotalPages] = useState(1);
  const [invTotal, setInvTotal] = useState(0);
  const [payPage, setPayPage] = useState(1);
  const [payTotalPages, setPayTotalPages] = useState(1);
  const [payTotal, setPayTotal] = useState(0);

  const productPag = usePagination(products, 25);
  const categoryPag = usePagination(categories, 25);
  const customerPag = usePagination(customers, 25);

  const getFilters = (): any => ({
    period,
    ...(period === 'custom' ? { startDate, endDate } : {}),
    page: tab === 'invoices' ? invPage : tab === 'payments' ? payPage : 1,
    pageSize: 25,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filters = getFilters();
    try {
      if (tab === 'summary') {
        const res = await window.rsInventory.getSalesReportSummary(filters);
        if (res.success) setSummary(res.data);
        else setError(res.error?.message ?? 'Error');
      } else if (tab === 'invoices') {
        const res = await window.rsInventory.getSalesInvoiceReportList(filters);
        if (res.success && res.data) {
          setInvoices(res.data.items ?? (res.data as any).data ?? []);
          setInvTotalPages(res.data.totalPages);
          setInvTotal(res.data.total);
        }
      } else if (tab === 'products') {
        const res = await window.rsInventory.getProductSalesReport(filters);
        if (res.success) setProducts(res.data ?? []);
      } else if (tab === 'categories') {
        const res = await window.rsInventory.getCategorySalesReport(filters);
        if (res.success) setCategories(res.data ?? []);
      } else if (tab === 'customers') {
        const res = await window.rsInventory.getCustomerSalesReport(filters);
        if (res.success) setCustomers(res.data ?? []);
      } else if (tab === 'payments') {
        const res = await window.rsInventory.getPaymentCollectionReport(filters);
        if (res.success && res.data) {
          setPayments(res.data.items ?? (res.data as any).data ?? []);
          setPayTotalPages(res.data.totalPages);
          setPayTotal(res.data.total);
        }
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [tab, period, startDate, endDate, invPage, payPage]);

  useEffect(() => {
    if (period !== 'custom') load();
  }, [tab, period, invPage, payPage]);

  const renderTabContent = () => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorState message={error} onRetry={load} />;

    if (tab === 'summary' && summary) {
      return (
        <div className="space-y-4">
          {/* KPI strip */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              label="Gross Sales"
              value={formatCurrency(summary.grossSales)}
              sub={`${summary.invoiceCount} invoices`}
              icon={<TrendingUp className="h-4 w-4" />}
              iconBg="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            />
            <KpiCard
              label="Net Sales"
              value={formatCurrency(summary.netSales)}
              sub={`Returns: ${formatCurrency(summary.salesReturns)}`}
              icon={<Receipt className="h-4 w-4" />}
              iconBg="bg-brand-500/10 border-brand-500/20 text-brand-400"
            />
            <KpiCard
              label="Total Discounts"
              value={formatCurrency(summary.totalDiscounts)}
              sub={`Line: ${formatCurrency(summary.lineDiscountTotal)} + Invoice: ${formatCurrency(summary.invoiceDiscountTotal)}`}
              icon={<Tag className="h-4 w-4" />}
              iconBg="bg-amber-500/10 border-amber-500/20 text-amber-400"
            />
            <KpiCard
              label="Total Tax"
              value={formatCurrency(summary.totalTax)}
              sub={`Avg invoice: ${formatCurrency(summary.averageInvoiceValue)}`}
              icon={<CreditCard className="h-4 w-4" />}
              iconBg="bg-violet-500/10 border-violet-500/20 text-violet-400"
            />
          </div>

          {/* Tax breakdown */}
          <ReportSection title="GST Tax Breakdown">
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

          {/* Payment methods */}
          <ReportSection title="Collections by Payment Method">
            <ReportTable
              headers={['Payment Method', 'Amount', 'Transactions']}
              rows={(summary.salesByPaymentMethod ?? []).map((m: any) => [
                <span className="font-medium text-slate-200">{m.method}</span>,
                <span className="font-semibold text-emerald-400">{formatCurrency(m.amount)}</span>,
                m.count,
              ])}
            />
          </ReportSection>
        </div>
      );
    }

    if (tab === 'invoices') {
      return (
        <ReportSection title="Sales Invoices" subtitle={`${invTotal.toLocaleString()} records`}>
          <ReportTable
            headers={['Invoice #', 'Date', 'Customer', 'Subtotal', 'Tax', 'Grand Total', 'Paid', 'Outstanding', 'Status']}
            rows={invoices.map((inv: any) => [
              <span className="font-mono text-brand-400">{inv.invoiceNumber}</span>,
              formatDate(inv.invoiceDate),
              inv.customerName ?? '—',
              formatCurrency(inv.subtotal),
              formatCurrency(inv.taxAmount),
              <span className="font-semibold text-white">{formatCurrency(inv.grandTotal)}</span>,
              <span className="text-emerald-400">{formatCurrency(inv.amountPaid)}</span>,
              inv.outstanding > 0.01 ? <span className="text-rose-400">{formatCurrency(inv.outstanding)}</span> : <span className="text-slate-500">—</span>,
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
        <ReportSection title="Product Sales" subtitle={`${products.length} products`}>
          <ReportTable
            headers={['Product', 'SKU', 'Qty Sold', 'Returns', 'Net Qty', 'Gross Sales', 'Discounts', 'Net Sales', 'COGS', 'Gross Profit', 'Margin %']}
            rows={productPag.paginated.map((p: any) => [
              <span className="font-medium text-slate-200">{p.productName}</span>,
              <span className="text-slate-500 font-mono text-[10px]">{p.sku ?? '—'}</span>,
              formatNumber(p.quantitySold, 0),
              p.returnedQuantity > 0 ? <span className="text-rose-400">-{p.returnedQuantity}</span> : <span className="text-slate-500">—</span>,
              formatNumber(p.netQuantitySold, 0),
              formatCurrency(p.grossSales),
              p.discountAmount > 0 ? <span className="text-amber-400">{formatCurrency(p.discountAmount)}</span> : <span className="text-slate-500">—</span>,
              <span className="font-semibold text-white">{formatCurrency(p.netSales)}</span>,
              p.cogsSold !== null ? formatCurrency(p.cogsSold) : <span className="text-slate-500 text-[10px]">N/A</span>,
              p.grossProfit !== null ? (
                <span className={p.grossProfit >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {formatCurrency(p.grossProfit)}
                </span>
              ) : <span className="text-slate-500 text-[10px]">N/A</span>,
              p.grossProfitMargin !== null ? <span className={p.grossProfitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{p.grossProfitMargin.toFixed(1)}%</span> : '—',
            ])}
          />
          <Pagination page={productPag.page} totalPages={productPag.totalPages} total={products.length} onPage={productPag.setPage} />
          {products.some((p: any) => !p.hasCostData) && (
            <div className="mt-3">
              <AlertBanner type="warning" message="Some products have no purchase price recorded. COGS and gross profit are not available for these items." />
            </div>
          )}
        </ReportSection>
      );
    }

    if (tab === 'categories') {
      return (
        <ReportSection title="Sales by Category" subtitle={`${categories.length} categories`}>
          <ReportTable
            headers={['Category', 'Qty Sold', 'Net Sales', 'Revenue Share']}
            rows={categoryPag.paginated.map((c: any) => [
              <span className="font-medium text-slate-200">{c.categoryName}</span>,
              formatNumber(c.quantitySold, 0),
              <span className="font-semibold text-white">{formatCurrency(c.netSales)}</span>,
              <div className="flex items-center gap-2">
                <div className="w-24 bg-surface-700 rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, c.sharePercent)}%` }}
                  />
                </div>
                <span className="text-slate-400">{c.sharePercent?.toFixed(1)}%</span>
              </div>,
            ])}
          />
          <Pagination page={categoryPag.page} totalPages={categoryPag.totalPages} total={categories.length} onPage={categoryPag.setPage} />
        </ReportSection>
      );
    }

    if (tab === 'customers') {
      return (
        <ReportSection title="Customer Sales Summary" subtitle={`${customers.length} customers`}>
          <ReportTable
            headers={['Customer', 'Invoices', 'Gross Sales', 'Returns', 'Net Sales', 'Payments', 'Outstanding']}
            rows={customerPag.paginated.map((c: any) => [
              <span className="font-medium text-slate-200">{c.customerName}</span>,
              c.invoiceCount,
              formatCurrency(c.grossSales),
              c.salesReturns > 0 ? <span className="text-rose-400">{formatCurrency(c.salesReturns)}</span> : '—',
              <span className="font-semibold text-white">{formatCurrency(c.netSales)}</span>,
              <span className="text-emerald-400">{formatCurrency(c.paymentsReceived)}</span>,
              c.outstandingBalance > 0.01 ? (
                <span className="text-rose-400 font-semibold">{formatCurrency(c.outstandingBalance)}</span>
              ) : '—',
            ])}
          />
          <Pagination page={customerPag.page} totalPages={customerPag.totalPages} total={customers.length} onPage={customerPag.setPage} />
        </ReportSection>
      );
    }

    if (tab === 'payments') {
      return (
        <ReportSection title="Payment Collections" subtitle={`${payTotal.toLocaleString()} records`}>
          <ReportTable
            headers={['Payment #', 'Date', 'Customer', 'Invoice', 'Method', 'Amount', 'Reference']}
            rows={payments.map((p: any) => [
              <span className="font-mono text-brand-400">{p.paymentNumber}</span>,
              formatDate(p.paymentDate),
              p.customerName ?? '—',
              p.invoiceNumber ?? '—',
              <span className="px-1.5 py-0.5 bg-surface-800 rounded text-[10px] text-slate-300 border border-surface-700">{p.paymentMode}</span>,
              <span className="font-semibold text-emerald-400">{formatCurrency(p.amount)}</span>,
              p.referenceNo ?? '—',
            ])}
          />
          <Pagination page={payPage} totalPages={payTotalPages} total={payTotal} onPage={setPayPage} />
        </ReportSection>
      );
    }

    return null;
  };

  return (
    <div className="p-5 space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-brand-600 text-white'
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
      {renderTabContent()}
    </div>
  );
};
