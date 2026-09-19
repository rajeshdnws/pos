import React, { useState, useEffect, useCallback } from 'react';
import {
  DateRangeFilter,
  KpiCard,
  ReportSection,
  ReportTable,
  LoadingSpinner,
  ErrorState,
  formatCurrency,
  formatDateTime,
  formatDate,
  Pagination,
  usePagination,
  ReportPeriod,
} from './report-utils';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  CalendarCheck,
  CreditCard,
  Banknote,
  AlertCircle,
  Search,
} from 'lucide-react';

type CashTab = 'cashbook' | 'expenses' | 'closings';

const TABS: { id: CashTab; label: string }[] = [
  { id: 'cashbook', label: 'Cashbook Ledger' },
  { id: 'expenses', label: 'Expenses Outflow' },
  { id: 'closings', label: 'Register Day-End Closings' },
];

export const CashReport: React.FC = () => {
  const [tab, setTab] = useState<CashTab>('cashbook');
  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for sub-reports
  const [cashbookData, setCashbookData] = useState<any>(null);
  const [expenseData, setExpenseData] = useState<any>(null);
  const [closingsData, setClosingsData] = useState<any[]>([]);

  const filteredMovements = (cashbookData?.rows ?? []).filter(
    (m: any) =>
      !search ||
      m.movementType.toLowerCase().includes(search.toLowerCase()) ||
      (m.referenceNumber && m.referenceNumber.toLowerCase().includes(search.toLowerCase())) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase())) ||
      (m.sessionNumber && m.sessionNumber.toLowerCase().includes(search.toLowerCase())),
  );
  const cashbookPag = usePagination(filteredMovements, 25);

  const filteredClosings = closingsData.filter(
    (c: any) =>
      !search ||
      (c.sessionNumber && c.sessionNumber.toLowerCase().includes(search.toLowerCase())) ||
      (c.closedByName && c.closedByName.toLowerCase().includes(search.toLowerCase())),
  );
  const closingsPag = usePagination(filteredClosings, 20);

  const getFilters = () => ({
    period,
    ...(period === 'custom' ? { startDate, endDate } : {}),
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filters = getFilters();

    try {
      if (tab === 'cashbook') {
        const res = await window.rsInventory.getCashbookReport(filters);
        if (res.success) {
          setCashbookData(res.data);
        } else {
          setError(res.error?.message ?? 'Failed to load Cashbook report');
        }
      } else if (tab === 'expenses') {
        const res = await window.rsInventory.getExpenseSummaryReport(filters);
        if (res.success) {
          setExpenseData(res.data);
        } else {
          setError(res.error?.message ?? 'Failed to load Expense Summary report');
        }
      } else if (tab === 'closings') {
        const res = await window.rsInventory.getRegisterClosingReport(filters);
        if (res.success) {
          setClosingsData(res.data ?? []);
        } else {
          setError(res.error?.message ?? 'Failed to load Register Closings report');
        }
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch cash report data');
    } finally {
      setLoading(false);
    }
  }, [tab, period, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate stats for closings
  const totalDifference = closingsData.reduce(
    (acc, curr) => acc + (curr.difference || 0),
    0,
  );
  const totalCounted = closingsData.reduce(
    (acc, curr) => acc + (curr.actualCountedCash || 0),
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
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Date Filter & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          {(tab === 'cashbook' || tab === 'closings') && (
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={tab === 'cashbook' ? 'Search movements...' : 'Search sessions...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-surface-900 border border-surface-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 w-48"
              />
            </div>
          )}
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
        </div>
      </div>

      {loading && <LoadingSpinner message="Calculating cash flows..." />}
      {error && <ErrorState message={error} onRetry={loadData} />}

      {!loading && !error && (
        <>
          {/* TAB 1: CASHBOOK LEDGER */}
          {tab === 'cashbook' && cashbookData && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Opening Cash"
                  value={formatCurrency(cashbookData.openingBalance)}
                  sub="Initial drawer balance"
                  icon={<Wallet className="h-4 w-4" />}
                  iconBg="bg-slate-500/10 border-slate-500/20 text-slate-400"
                />
                <KpiCard
                  label="Total Cash Inflow"
                  value={formatCurrency(cashbookData.totalCashIn)}
                  sub="Sales, deposits, customer dues"
                  icon={<ArrowDownLeft className="h-4 w-4" />}
                  iconBg="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                />
                <KpiCard
                  label="Total Cash Outflow"
                  value={formatCurrency(cashbookData.totalCashOut)}
                  sub="Expenses, supplier cash, withdrawals"
                  icon={<ArrowUpRight className="h-4 w-4" />}
                  iconBg="bg-rose-500/10 border-rose-500/20 text-rose-400"
                />
                <KpiCard
                  label="Net Closing Cash"
                  value={formatCurrency(cashbookData.closingBalance)}
                  sub="Calculated drawer balance"
                  icon={<Banknote className="h-4 w-4" />}
                  iconBg="bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                  trend={{
                    value: cashbookData.closingBalance >= 0 ? 'Surplus' : 'Deficit',
                    positive: cashbookData.closingBalance >= 0,
                  }}
                />
              </div>

              {/* Cash Movements Table */}
              <ReportSection
                title="Cash Movement Journal"
                subtitle="Chronological log of drawer inflows and outflows with progressive balance"
              >
                <ReportTable
                  headers={[
                    'Date & Time',
                    'Type',
                    'Session #',
                    'Reference #',
                    'Description',
                    'Cash In',
                    'Cash Out',
                    'Running Balance',
                  ]}
                  rows={cashbookPag.paginated.map((m: any) => [
                    <span className="text-slate-400 whitespace-nowrap">{formatDateTime(m.movementDate)}</span>,
                    <span className="font-semibold text-slate-200">
                      {m.movementType.replace(/_/g, ' ')}
                    </span>,
                    <span className="font-mono text-cyan-400">{m.sessionNumber || '—'}</span>,
                    <span className="font-mono text-slate-400">{m.referenceNumber || '—'}</span>,
                    <span className="text-slate-300 max-w-xs truncate">{m.description || '—'}</span>,
                    <span className={`font-mono font-medium ${m.cashIn > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {m.cashIn > 0 ? `+${formatCurrency(m.cashIn)}` : '—'}
                    </span>,
                    <span className={`font-mono font-medium ${m.cashOut > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                      {m.cashOut > 0 ? `-${formatCurrency(m.cashOut)}` : '—'}
                    </span>,
                    <span className="font-mono font-bold text-white">
                      {formatCurrency(m.runningBalance)}
                    </span>,
                  ])}
                  emptyMessage="No cash movements recorded for this period"
                />
                <Pagination
                  page={cashbookPag.page}
                  totalPages={cashbookPag.totalPages}
                  total={filteredMovements.length}
                  onPage={cashbookPag.setPage}
                />
              </ReportSection>
            </div>
          )}

          {/* TAB 2: EXPENSES OUTFLOW */}
          {tab === 'expenses' && expenseData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                  label="Total Operating Expenses"
                  value={formatCurrency(expenseData.totalExpenses)}
                  sub={`${(expenseData.rows ?? []).reduce((s: number, r: any) => s + r.expenseCount, 0)} total receipts`}
                  icon={<TrendingDown className="h-4 w-4" />}
                  iconBg="bg-rose-500/10 border-rose-500/20 text-rose-400"
                />
                <KpiCard
                  label="Paid via Cash"
                  value={formatCurrency(expenseData.totalCash)}
                  sub="Direct register outflows"
                  icon={<Banknote className="h-4 w-4" />}
                  iconBg="bg-amber-500/10 border-amber-500/20 text-amber-400"
                />
                <KpiCard
                  label="Paid via Non-Cash"
                  value={formatCurrency(expenseData.totalNonCash)}
                  sub="Bank, UPI, cards"
                  icon={<CreditCard className="h-4 w-4" />}
                  iconBg="bg-blue-500/10 border-blue-500/20 text-blue-400"
                />
              </div>

              {/* Expense Category Breakdown */}
              <ReportSection
                title="Expense Breakdown by Category"
                subtitle="Overview of operating disbursements divided into cash and digital payments"
              >
                <ReportTable
                  headers={[
                    'Expense Category',
                    'Receipts Count',
                    'Cash Amount',
                    'Non-Cash Amount',
                    'Total Amount',
                    '% Share',
                  ]}
                  rows={(expenseData.rows ?? []).map((row: any) => {
                    const share =
                      expenseData.totalExpenses > 0
                        ? (row.totalAmount / expenseData.totalExpenses) * 100
                        : 0;
                    return [
                      <span className="font-semibold text-white">{row.categoryName}</span>,
                      <span className="font-mono text-slate-400">{row.expenseCount}</span>,
                      <span className="font-mono text-amber-400">{formatCurrency(row.cashAmount)}</span>,
                      <span className="font-mono text-blue-400">{formatCurrency(row.nonCashAmount)}</span>,
                      <span className="font-mono font-bold text-slate-100">{formatCurrency(row.totalAmount)}</span>,
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${Math.min(100, share)}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-400 text-[10px]">{share.toFixed(1)}%</span>
                      </div>,
                    ];
                  })}
                  emptyMessage="No expenses recorded for this period"
                />
              </ReportSection>
            </div>
          )}

          {/* TAB 3: REGISTER CLOSINGS */}
          {tab === 'closings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                  label="Closed Sessions"
                  value={closingsData.length.toString()}
                  sub="End-of-day register settlements"
                  icon={<CalendarCheck className="h-4 w-4" />}
                  iconBg="bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                />
                <KpiCard
                  label="Total Cash Counted"
                  value={formatCurrency(totalCounted)}
                  sub="Physical cash settled in drawer"
                  icon={<Banknote className="h-4 w-4" />}
                  iconBg="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                />
                <KpiCard
                  label="Net Discrepancy"
                  value={formatCurrency(Math.abs(totalDifference))}
                  sub={
                    totalDifference === 0
                      ? 'Perfect drawer balance'
                      : totalDifference > 0
                      ? 'Net Excess Cash'
                      : 'Net Cash Shortage'
                  }
                  icon={<AlertCircle className="h-4 w-4" />}
                  iconBg={
                    totalDifference === 0
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : totalDifference > 0
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }
                  trend={{
                    value: totalDifference >= 0 ? 'Balanced / Excess' : 'Shortage',
                    positive: totalDifference >= 0,
                  }}
                />
              </div>

              <ReportSection
                title="Register Closing Audit Trail"
                subtitle="Reconciliation of calculated vs actual physical cash counted per session"
              >
                <ReportTable
                  headers={[
                    'Closing Date',
                    'Session #',
                    'Register',
                    'Closed By',
                    'Opening Cash',
                    'Cash Sales',
                    'Cash In/Out',
                    'Expected Cash',
                    'Actual Counted',
                    'Discrepancy',
                    'Status',
                  ]}
                  rows={closingsPag.paginated.map((c: any) => {
                    const diff = c.difference || 0;
                    return [
                      <span className="text-slate-400 whitespace-nowrap">{formatDate(c.closingDate)}</span>,
                      <span className="font-mono font-medium text-cyan-400">{c.sessionNumber}</span>,
                      <span className="text-slate-300">{c.registerName || 'Main Register'}</span>,
                      <span className="text-slate-300">{c.closedByName || '—'}</span>,
                      <span className="font-mono">{formatCurrency(c.openingCash)}</span>,
                      <span className="font-mono text-emerald-400">{formatCurrency(c.cashSales)}</span>,
                      <span className="font-mono text-slate-300">
                        {formatCurrency((c.cashIn || 0) - (c.cashOut || 0))}
                      </span>,
                      <span className="font-mono text-slate-200">{formatCurrency(c.calculatedClosingCash)}</span>,
                      <span className="font-mono font-semibold text-white">{formatCurrency(c.actualCountedCash)}</span>,
                      <span
                        className={`font-mono font-bold ${
                          diff === 0
                            ? 'text-emerald-400'
                            : diff > 0
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {diff === 0 ? '₹0.00' : diff > 0 ? `+${formatCurrency(diff)}` : `-${formatCurrency(Math.abs(diff))}`}
                      </span>,
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          diff === 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : diff > 0
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {diff === 0 ? 'Exact Match' : diff > 0 ? 'Excess' : 'Shortage'}
                      </span>,
                    ];
                  })}
                  emptyMessage="No day-end register closings recorded for this period"
                />
                <Pagination
                  page={closingsPag.page}
                  totalPages={closingsPag.totalPages}
                  total={filteredClosings.length}
                  onPage={closingsPag.setPage}
                />
              </ReportSection>
            </div>
          )}
        </>
      )}
    </div>
  );
};
