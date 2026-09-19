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
  formatPercent,
  Pagination,
  usePagination,
  ReportPeriod,
} from './report-utils';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Truck,
  Receipt,
  Search,
} from 'lucide-react';

type FinancialTab = 'profit_loss' | 'customer_outstanding' | 'supplier_outstanding' | 'tax_summary';

const TABS: { id: FinancialTab; label: string }[] = [
  { id: 'profit_loss', label: 'Profit & Loss (P&L)' },
  { id: 'customer_outstanding', label: 'Receivables (Customers)' },
  { id: 'supplier_outstanding', label: 'Payables (Suppliers)' },
  { id: 'tax_summary', label: 'Tax & GST Summary' },
];

export const FinancialReport: React.FC = () => {
  const [tab, setTab] = useState<FinancialTab>('profit_loss');
  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Report states
  const [plData, setPlData] = useState<any>(null);
  const [customerOutstanding, setCustomerOutstanding] = useState<any[]>([]);
  const [supplierOutstanding, setSupplierOutstanding] = useState<any[]>([]);
  const [taxData, setTaxData] = useState<any>(null);

  const customerPag = usePagination(
    customerOutstanding.filter(
      (c) =>
        !search ||
        c.customerName.toLowerCase().includes(search.toLowerCase()) ||
        c.customerCode.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)),
    ),
    20,
  );

  const supplierPag = usePagination(
    supplierOutstanding.filter(
      (s) =>
        !search ||
        s.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        s.supplierCode.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone && s.phone.includes(search)),
    ),
    20,
  );

  const getFilters = () => ({
    period,
    ...(period === 'custom' ? { startDate, endDate } : {}),
    search: search || undefined,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filters = getFilters();

    try {
      if (tab === 'profit_loss') {
        const res = await window.rsInventory.getProfitLossReport(filters);
        if (res.success) {
          setPlData(res.data);
        } else {
          setError(res.error?.message ?? 'Failed to load Profit & Loss report');
        }
      } else if (tab === 'customer_outstanding') {
        const res = await window.rsInventory.getCustomerOutstandingReport(filters);
        if (res.success) {
          setCustomerOutstanding(res.data ?? []);
        } else {
          setError(res.error?.message ?? 'Failed to load Customer Outstanding report');
        }
      } else if (tab === 'supplier_outstanding') {
        const res = await window.rsInventory.getSupplierOutstandingReport(filters);
        if (res.success) {
          setSupplierOutstanding(res.data ?? []);
        } else {
          setError(res.error?.message ?? 'Failed to load Supplier Outstanding report');
        }
      } else if (tab === 'tax_summary') {
        const res = await window.rsInventory.getTaxSummaryReport(filters);
        if (res.success) {
          setTaxData(res.data);
        } else {
          setError(res.error?.message ?? 'Failed to load Tax Summary report');
        }
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [tab, period, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate stats for outstanding
  const totalReceivables = customerOutstanding.reduce(
    (acc, curr) => acc + (curr.balanceType === 'DEBIT' ? curr.outstandingBalance : 0),
    0,
  );
  const totalPayables = supplierOutstanding.reduce(
    (acc, curr) => acc + (curr.balanceType === 'CREDIT' ? curr.outstandingBalance : 0),
    0,
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Sub Tabs */}
        <div className="flex items-center gap-1 bg-surface-900/80 p-1 rounded-xl border border-surface-800 self-start overflow-x-auto max-w-full">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSearch('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        {tab !== 'customer_outstanding' && tab !== 'supplier_outstanding' ? (
          <DateRangeFilter
            period={period}
            startDate={startDate}
            endDate={endDate}
            onPeriodChange={setPeriod}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onApply={loadData}
            loading={loading}
          />
        ) : (
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, code, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface-900 border border-surface-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 w-56"
            />
          </div>
        )}
      </div>

      {loading && <LoadingSpinner message="Calculating financial metrics..." />}
      {error && <ErrorState message={error} onRetry={loadData} />}

      {!loading && !error && (
        <>
          {/* TAB 1: PROFIT & LOSS */}
          {tab === 'profit_loss' && plData && (
            <div className="space-y-6">
              {/* Disclosures & Warnings */}
              {plData.limitations && plData.limitations.length > 0 && (
                <div className="space-y-2">
                  {plData.limitations.map((msg: string, i: number) => (
                    <AlertBanner
                      key={i}
                      type={msg.includes('No cost data') || msg.includes('understated') ? 'warning' : 'info'}
                      message={msg}
                    />
                  ))}
                </div>
              )}

              {/* KPI Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Net Sales Revenue"
                  value={formatCurrency(plData.netSales)}
                  sub={`Gross: ${formatCurrency(plData.grossSales)} | Ret: ${formatCurrency(plData.salesReturns)}`}
                  icon={<TrendingUp className="h-4 w-4" />}
                  iconBg="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                />
                <KpiCard
                  label="Cost of Goods Sold (COGS)"
                  value={formatCurrency(plData.netCOGS)}
                  sub={`${plData.itemsWithMissingCost || 0} items missing unit cost`}
                  icon={<DollarSign className="h-4 w-4" />}
                  iconBg="bg-amber-500/10 border-amber-500/20 text-amber-400"
                  warning={plData.partialCostData ? 'Partial cost data - COGS understated' : undefined}
                />
                <KpiCard
                  label="Gross Profit"
                  value={formatCurrency(plData.grossProfit)}
                  sub={plData.grossProfitMargin !== null ? `Margin: ${formatPercent(plData.grossProfitMargin)}` : 'Margin: N/A'}
                  icon={<DollarSign className="h-4 w-4" />}
                  iconBg={plData.grossProfit >= 0 ? 'bg-brand-500/10 border-brand-500/20 text-brand-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}
                  trend={
                    plData.grossProfitMargin !== null
                      ? { value: `${plData.grossProfitMargin.toFixed(1)}% margin`, positive: plData.grossProfit >= 0 }
                      : undefined
                  }
                />
                <KpiCard
                  label="Est. Operating Result"
                  value={formatCurrency(plData.estimatedOperatingResult)}
                  sub={`Operating Exp: ${formatCurrency(plData.totalOperatingExpenses)}`}
                  icon={plData.estimatedOperatingResult >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  iconBg={plData.estimatedOperatingResult >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}
                  trend={
                    plData.operatingMargin !== null
                      ? { value: `${plData.operatingMargin.toFixed(1)}% net`, positive: plData.estimatedOperatingResult >= 0 }
                      : undefined
                  }
                />
              </div>

              {/* Statement Format View */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <ReportSection title="Income Statement Breakdown (Estimate)" subtitle="Management profit & loss accounting view">
                    <div className="space-y-4 text-xs">
                      {/* Revenue Section */}
                      <div className="bg-surface-950/60 rounded-xl p-4 border border-surface-800/80 space-y-2">
                        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Trading Revenue</div>
                        <div className="flex justify-between py-1 text-slate-400 border-b border-surface-800">
                          <span>Gross Sales Invoices</span>
                          <span className="font-mono text-slate-200">{formatCurrency(plData.grossSales)}</span>
                        </div>
                        <div className="flex justify-between py-1 text-slate-400 border-b border-surface-800">
                          <span>Less: Sales Returns</span>
                          <span className="font-mono text-rose-400">-{formatCurrency(plData.salesReturns)}</span>
                        </div>
                        <div className="flex justify-between py-1 text-slate-400 border-b border-surface-800">
                          <span>Less: Discounts Granted</span>
                          <span className="font-mono text-slate-400">-{formatCurrency(plData.salesDiscounts)}</span>
                        </div>
                        <div className="flex justify-between pt-1 font-semibold text-white">
                          <span>Net Sales Revenue</span>
                          <span className="font-mono text-emerald-400">{formatCurrency(plData.netSales)}</span>
                        </div>
                      </div>

                      {/* COGS Section */}
                      <div className="bg-surface-950/60 rounded-xl p-4 border border-surface-800/80 space-y-2">
                        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Cost of Goods Sold (COGS)</div>
                        <div className="flex justify-between py-1 text-slate-400 border-b border-surface-800">
                          <span>Gross Cost of Items Sold</span>
                          <span className="font-mono text-slate-200">{formatCurrency(plData.grossCOGS)}</span>
                        </div>
                        <div className="flex justify-between py-1 text-slate-400 border-b border-surface-800">
                          <span>Less: COGS Reversal from Returns</span>
                          <span className="font-mono text-emerald-400">-{formatCurrency(plData.cogsReturnReversal)}</span>
                        </div>
                        <div className="flex justify-between pt-1 font-semibold text-white">
                          <span>Net Cost of Goods Sold</span>
                          <span className="font-mono text-amber-400">{formatCurrency(plData.netCOGS)}</span>
                        </div>
                      </div>

                      {/* Gross Profit Subtotal */}
                      <div className="flex justify-between p-4 rounded-xl bg-surface-800/40 border border-surface-700/60 font-semibold text-sm">
                        <span className="text-slate-200">Gross Profit (Net Sales - Net COGS)</span>
                        <span className={`font-mono ${plData.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(plData.grossProfit)}
                        </span>
                      </div>

                      {/* Operating Expenses Summary */}
                      <div className="bg-surface-950/60 rounded-xl p-4 border border-surface-800/80 space-y-2">
                        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Operating Expenses</div>
                        <div className="flex justify-between py-1 text-slate-400 border-b border-surface-800">
                          <span>Total Recorded Operating Expenses</span>
                          <span className="font-mono text-rose-400">-{formatCurrency(plData.totalOperatingExpenses)}</span>
                        </div>
                      </div>

                      {/* Operating Income / Net Result */}
                      <div className={`flex justify-between p-4 rounded-xl border font-bold text-sm ${
                        plData.estimatedOperatingResult >= 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                          : 'bg-rose-500/10 border-rose-500/30 text-white'
                      }`}>
                        <span>Estimated Operating Result</span>
                        <span className={`font-mono text-base ${plData.estimatedOperatingResult >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(plData.estimatedOperatingResult)}
                        </span>
                      </div>
                    </div>
                  </ReportSection>
                </div>

                {/* Right Panel: Expense Breakdown */}
                <div className="space-y-4">
                  <ReportSection title="Operating Expenses by Category" subtitle="Breakdown of recorded outflows">
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {(!plData.expensesByCategory || plData.expensesByCategory.length === 0) ? (
                        <div className="text-center py-8 text-slate-500 text-xs">No expenses recorded for this period</div>
                      ) : (
                        plData.expensesByCategory.map((cat: any, idx: number) => {
                          const pct = plData.totalOperatingExpenses > 0
                            ? (cat.amount / plData.totalOperatingExpenses) * 100
                            : 0;
                          return (
                            <div key={idx} className="p-2.5 rounded-lg bg-surface-950/40 border border-surface-800 space-y-1.5">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="text-slate-200 truncate">{cat.categoryName}</span>
                                <span className="font-mono text-white shrink-0">{formatCurrency(cat.amount)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono w-8 text-right">{pct.toFixed(0)}%</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ReportSection>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMER OUTSTANDING (RECEIVABLES) */}
          {tab === 'customer_outstanding' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                  label="Total Receivables"
                  value={formatCurrency(totalReceivables)}
                  sub="Amount due from customers"
                  icon={<Users className="h-4 w-4" />}
                  iconBg="bg-rose-500/10 border-rose-500/20 text-rose-400"
                />
                <KpiCard
                  label="Debtor Customers"
                  value={customerOutstanding.filter((c) => c.balanceType === 'DEBIT' && c.outstandingBalance > 0).length.toString()}
                  sub="Accounts with pending balance"
                  icon={<Users className="h-4 w-4" />}
                  iconBg="bg-amber-500/10 border-amber-500/20 text-amber-400"
                />
                <KpiCard
                  label="Total Active Accounts"
                  value={customerOutstanding.length.toString()}
                  sub="Master directory customers"
                  icon={<Users className="h-4 w-4" />}
                  iconBg="bg-brand-500/10 border-brand-500/20 text-brand-400"
                />
              </div>

              <ReportSection title="Customer Balances & Receivables" subtitle="Aging ledger summary of all customer accounts">
                <ReportTable
                  headers={[
                    'Customer Name',
                    'Code',
                    'Phone',
                    'Opening Bal',
                    'Total Invoiced',
                    'Total Collected',
                    'Credit Notes',
                    'Outstanding Balance',
                    'Status',
                  ]}
                  rows={customerPag.paginated.map((row) => [
                    <span className="font-medium text-white">{row.customerName}</span>,
                    <span className="font-mono text-slate-400">{row.customerCode}</span>,
                    <span className="text-slate-400">{row.phone || '—'}</span>,
                    <span className="font-mono">{formatCurrency(row.openingBalance)}</span>,
                    <span className="font-mono text-slate-200">{formatCurrency(row.totalSales)}</span>,
                    <span className="font-mono text-emerald-400">{formatCurrency(row.totalPayments)}</span>,
                    <span className="font-mono text-slate-400">{formatCurrency(row.totalReturns)}</span>,
                    <span className={`font-mono font-bold ${row.outstandingBalance > 0 ? (row.balanceType === 'DEBIT' ? 'text-rose-400' : 'text-emerald-400') : 'text-slate-400'}`}>
                      {formatCurrency(row.outstandingBalance)}
                    </span>,
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        row.balanceType === 'DEBIT' && row.outstandingBalance > 0
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : row.balanceType === 'CREDIT' && row.outstandingBalance > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {row.balanceType === 'DEBIT' && row.outstandingBalance > 0
                        ? 'Due from Customer'
                        : row.balanceType === 'CREDIT' && row.outstandingBalance > 0
                        ? 'Advance / Credit'
                        : 'Settled'}
                    </span>,
                  ])}
                  emptyMessage="No customer records found"
                />
                <Pagination
                  page={customerPag.page}
                  totalPages={customerPag.totalPages}
                  total={customerOutstanding.length}
                  onPage={customerPag.setPage}
                />
              </ReportSection>
            </div>
          )}

          {/* TAB 3: SUPPLIER OUTSTANDING (PAYABLES) */}
          {tab === 'supplier_outstanding' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                  label="Total Payables"
                  value={formatCurrency(totalPayables)}
                  sub="Amount owed to suppliers"
                  icon={<Truck className="h-4 w-4" />}
                  iconBg="bg-rose-500/10 border-rose-500/20 text-rose-400"
                />
                <KpiCard
                  label="Creditor Suppliers"
                  value={supplierOutstanding.filter((s) => s.balanceType === 'CREDIT' && s.outstandingBalance > 0).length.toString()}
                  sub="Vendors with pending dues"
                  icon={<Truck className="h-4 w-4" />}
                  iconBg="bg-amber-500/10 border-amber-500/20 text-amber-400"
                />
                <KpiCard
                  label="Total Active Suppliers"
                  value={supplierOutstanding.length.toString()}
                  sub="Registered vendor directory"
                  icon={<Truck className="h-4 w-4" />}
                  iconBg="bg-brand-500/10 border-brand-500/20 text-brand-400"
                />
              </div>

              <ReportSection title="Supplier Balances & Payables" subtitle="Aging ledger summary of all supplier payables">
                <ReportTable
                  headers={[
                    'Supplier Name',
                    'Code',
                    'Phone',
                    'Opening Bal',
                    'Total Purchases',
                    'Total Paid',
                    'Debit Notes',
                    'Outstanding Balance',
                    'Status',
                  ]}
                  rows={supplierPag.paginated.map((row) => [
                    <span className="font-medium text-white">{row.supplierName}</span>,
                    <span className="font-mono text-slate-400">{row.supplierCode}</span>,
                    <span className="text-slate-400">{row.phone || '—'}</span>,
                    <span className="font-mono">{formatCurrency(row.openingBalance)}</span>,
                    <span className="font-mono text-slate-200">{formatCurrency(row.totalPurchases)}</span>,
                    <span className="font-mono text-emerald-400">{formatCurrency(row.totalPayments)}</span>,
                    <span className="font-mono text-slate-400">{formatCurrency(row.totalReturns)}</span>,
                    <span className={`font-mono font-bold ${row.outstandingBalance > 0 ? (row.balanceType === 'CREDIT' ? 'text-rose-400' : 'text-emerald-400') : 'text-slate-400'}`}>
                      {formatCurrency(row.outstandingBalance)}
                    </span>,
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        row.balanceType === 'CREDIT' && row.outstandingBalance > 0
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : row.balanceType === 'DEBIT' && row.outstandingBalance > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {row.balanceType === 'CREDIT' && row.outstandingBalance > 0
                        ? 'Payable to Vendor'
                        : row.balanceType === 'DEBIT' && row.outstandingBalance > 0
                        ? 'Advance / Debit Note'
                        : 'Settled'}
                    </span>,
                  ])}
                  emptyMessage="No supplier records found"
                />
                <Pagination
                  page={supplierPag.page}
                  totalPages={supplierPag.totalPages}
                  total={supplierOutstanding.length}
                  onPage={supplierPag.setPage}
                />
              </ReportSection>
            </div>
          )}

          {/* TAB 4: TAX & GST SUMMARY */}
          {tab === 'tax_summary' && taxData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                  label="Output Tax (Sales)"
                  value={formatCurrency(taxData.netSalesTax)}
                  sub={`Gross: ${formatCurrency(taxData.totalSalesTax)} | Returns: -${formatCurrency(taxData.salesReturnTaxReversal)}`}
                  icon={<Receipt className="h-4 w-4" />}
                  iconBg="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                />
                <KpiCard
                  label="Input Tax Credit (Purchases)"
                  value={formatCurrency(taxData.netPurchaseTax)}
                  sub={`Gross: ${formatCurrency(taxData.totalPurchaseTax)} | Returns: -${formatCurrency(taxData.purchaseReturnTaxReversal)}`}
                  icon={<Receipt className="h-4 w-4" />}
                  iconBg="bg-blue-500/10 border-blue-500/20 text-blue-400"
                />
                <KpiCard
                  label="Net Tax Liability"
                  value={formatCurrency(Math.abs(taxData.netTaxLiability))}
                  sub={taxData.netTaxLiability >= 0 ? 'Payable to Government' : 'ITC Carryforward Credit'}
                  icon={<DollarSign className="h-4 w-4" />}
                  iconBg={taxData.netTaxLiability >= 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}
                  trend={{
                    value: taxData.netTaxLiability >= 0 ? 'Tax Payable' : 'ITC Credit',
                    positive: taxData.netTaxLiability <= 0,
                  }}
                />
              </div>

              {/* Tax Rate Breakdowns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReportSection title="Sales Tax by GST Rate Slab (GSTR-1 Outward)" subtitle="Tax collected on outward supplies">
                  <ReportTable
                    headers={['Rate Slab', 'Taxable Val', 'CGST', 'SGST', 'IGST', 'Cess', 'Total Tax', 'Inv Count']}
                    rows={(taxData.salesByRate ?? []).map((row: any) => [
                      <span className="font-semibold text-white">{row.taxRate}%</span>,
                      <span className="font-mono text-slate-200">{formatCurrency(row.taxableAmount)}</span>,
                      <span className="font-mono text-slate-400">{formatCurrency(row.cgstAmount)}</span>,
                      <span className="font-mono text-slate-400">{formatCurrency(row.sgstAmount)}</span>,
                      <span className="font-mono text-slate-400">{formatCurrency(row.igstAmount)}</span>,
                      <span className="font-mono text-slate-400">{formatCurrency(row.cessAmount)}</span>,
                      <span className="font-mono font-bold text-emerald-400">{formatCurrency(row.totalTax)}</span>,
                      <span className="font-mono text-slate-400">{row.invoiceCount}</span>,
                    ])}
                    emptyMessage="No sales tax records for this period"
                  />
                </ReportSection>

                <ReportSection title="Purchase Tax by GST Rate Slab (GSTR-3B Inward)" subtitle="Input tax credit on inward supplies">
                  <ReportTable
                    headers={['Rate Slab', 'Taxable Val', 'CGST', 'SGST', 'IGST', 'Cess', 'Total Tax', 'Bill Count']}
                    rows={(taxData.purchasesByRate ?? []).map((row: any) => [
                      <span className="font-semibold text-white">{row.taxRate}%</span>,
                      <span className="font-mono text-slate-200">{formatCurrency(row.taxableAmount)}</span>,
                      <span className="font-mono text-slate-400">{formatCurrency(row.cgstAmount)}</span>,
                      <span className="font-mono text-slate-400">{formatCurrency(row.sgstAmount)}</span>,
                      <span className="font-mono text-slate-400">{formatCurrency(row.igstAmount)}</span>,
                      <span className="font-mono text-slate-400">{formatCurrency(row.cessAmount)}</span>,
                      <span className="font-mono font-bold text-blue-400">{formatCurrency(row.totalTax)}</span>,
                      <span className="font-mono text-slate-400">{row.invoiceCount}</span>,
                    ])}
                    emptyMessage="No purchase tax records for this period"
                  />
                </ReportSection>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
