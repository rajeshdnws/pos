import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Boxes,
  Users,
  Truck,
  AlertTriangle,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  DateRangeFilter,
  KpiCard,
  ReportSection,
  LoadingSpinner,
  ErrorState,
  formatCurrency,
  ReportPeriod,
} from './report-utils';

const PIE_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
  '#84cc16', '#f97316', '#ec4899', '#14b8a6',
];

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="font-semibold text-white">
            {typeof entry.value === 'number'
              ? `₹${Number(entry.value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const CustomPieTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-semibold">{item.name}</p>
      <p className="text-slate-300">
        ₹{Number(item.value).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
      </p>
      <p className="text-slate-400">{item.payload.percent?.toFixed(1)}%</p>
    </div>
  );
};

export const ReportDashboard: React.FC = () => {
  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kpis, setKpis] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFilters = () => ({
    period,
    ...(period === 'custom' ? { startDate, endDate } : {}),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = getFilters();
      const [kpisRes, chartsRes] = await Promise.all([
        window.rsInventory.getReportDashboardKPIs(filters),
        window.rsInventory.getReportChartsData(filters),
      ]);
      if (kpisRes.success) setKpis(kpisRes.data);
      else setError(kpisRes.error?.message ?? 'Failed to load KPIs');
      if (chartsRes.success) setCharts(chartsRes.data);
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    if (period !== 'custom') load();
  }, [period]);

  if (loading) return <LoadingSpinner message="Loading overview data..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const salesTrend: any[] = (charts?.salesTrend ?? []).map((d: any) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  }));

  const categoryShare: any[] = charts?.categoryShare ?? [];
  const topProducts: any[] = (charts?.topProductsByValue ?? []).slice(0, 8);
  const paymentDist: any[] = charts?.paymentMethodDistribution ?? [];

  return (
    <div className="p-5 space-y-5">
      {/* Date Range Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Business Overview</h2>
          {kpis && (
            <p className="text-[10px] text-slate-500 mt-0.5">
              {kpis.startDate} → {kpis.endDate} · {kpis.period}
            </p>
          )}
        </div>
        <DateRangeFilter
          period={period}
          startDate={startDate}
          endDate={endDate}
          onPeriodChange={setPeriod}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApply={load}
        />
      </div>

      {!kpis ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-xs">
          Select a period to view data
        </div>
      ) : (
        <>
          {/* KPIs Grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              label="Net Sales"
              value={formatCurrency(kpis.netSales)}
              sub={`${kpis.salesInvoiceCount} invoices · Avg ${formatCurrency(kpis.averageInvoiceValue)}`}
              icon={<TrendingUp className="h-4 w-4" />}
              iconBg="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              warning={
                kpis.salesReturns > 0
                  ? `Returns: ${formatCurrency(kpis.salesReturns)}`
                  : undefined
              }
            />
            <KpiCard
              label="Gross Profit"
              value={
                kpis.hasCostData
                  ? formatCurrency(kpis.grossProfit)
                  : 'No cost data'
              }
              sub={
                kpis.grossProfitMargin !== null
                  ? `Margin: ${kpis.grossProfitMargin?.toFixed(1)}%`
                  : 'COGS unavailable'
              }
              icon={<BarChart2 className="h-4 w-4" />}
              iconBg="bg-brand-500/10 border-brand-500/20 text-brand-400"
              warning={!kpis.hasCostData ? 'Set purchase prices for profit tracking' : undefined}
            />
            <KpiCard
              label="Total Expenses"
              value={formatCurrency(kpis.totalExpenses)}
              sub={`Net purchases: ${formatCurrency(kpis.netPurchases)}`}
              icon={<TrendingDown className="h-4 w-4" />}
              iconBg="bg-rose-500/10 border-rose-500/20 text-rose-400"
            />
            <KpiCard
              label="Stock Value"
              value={formatCurrency(kpis.totalStockValue)}
              sub={`${kpis.totalStockItems} products tracked`}
              icon={<Boxes className="h-4 w-4" />}
              iconBg="bg-amber-500/10 border-amber-500/20 text-amber-400"
            />
          </div>

          {/* Second KPI row */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              label="Receivables"
              value={formatCurrency(kpis.totalReceivables)}
              sub={`${kpis.customersWithBalance} customers with balance`}
              icon={<Users className="h-4 w-4" />}
              iconBg="bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
            />
            <KpiCard
              label="Payables"
              value={formatCurrency(kpis.totalPayables)}
              sub={`${kpis.suppliersWithBalance} suppliers with balance`}
              icon={<Truck className="h-4 w-4" />}
              iconBg="bg-violet-500/10 border-violet-500/20 text-violet-400"
            />
            <KpiCard
              label="Low Stock Items"
              value={String(kpis.lowStockCount)}
              sub={`${kpis.outOfStockCount} out of stock`}
              icon={<AlertTriangle className="h-4 w-4" />}
              iconBg={
                kpis.lowStockCount > 0
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }
              warning={kpis.outOfStockCount > 0 ? `${kpis.outOfStockCount} products need restocking` : undefined}
            />
            <KpiCard
              label="Net Purchase"
              value={formatCurrency(kpis.netPurchases)}
              sub={`${kpis.purchaseInvoiceCount} purchase invoices`}
              icon={<ShoppingCart className="h-4 w-4" />}
              iconBg="bg-purple-500/10 border-purple-500/20 text-purple-400"
            />
          </div>

          {/* Charts Row 1 — Trend + Category */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Sales vs Purchases vs Expenses Trend */}
            <div className="xl:col-span-2">
              <ReportSection
                title="Sales vs Purchases vs Expenses"
                subtitle="Daily trend for selected period"
              >
                {salesTrend.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-slate-500 text-xs">
                    No trend data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={salesTrend} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                      <Area type="monotone" dataKey="sales" name="Sales" stroke="#10b981" fill="url(#salesGrad)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#8b5cf6" fill="url(#purchaseGrad)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ReportSection>
            </div>

            {/* Category Sales Share */}
            <div>
              <ReportSection title="Sales by Category" subtitle="Revenue share">
                {categoryShare.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-slate-500 text-xs">
                    No category data
                  </div>
                ) : (
                  <div>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie
                          data={categoryShare}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
                          paddingAngle={3}
                        >
                          {categoryShare.map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {categoryShare.slice(0, 5).map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-slate-400 truncate flex-1">{c.name}</span>
                          <span className="text-slate-300 font-medium">{c.percent?.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ReportSection>
            </div>
          </div>

          {/* Charts Row 2 — Top Products + Payment Methods */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Top Products by Revenue */}
            <ReportSection title="Top Products by Revenue" subtitle="Net sales value">
              {topProducts.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-slate-500 text-xs">
                  No product sales data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="productName" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="netSales" name="Net Sales" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ReportSection>

            {/* Payment Method Distribution */}
            <ReportSection title="Payment Methods" subtitle="Collections breakdown">
              {paymentDist.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-slate-500 text-xs">
                  No payment data
                </div>
              ) : (
                <div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={paymentDist} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="method" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                        {paymentDist.map((_: any, i: number) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {paymentDist.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 bg-surface-800/50 rounded-lg px-3 py-2">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400 truncate">{p.method}</div>
                          <div className="text-xs font-semibold text-white">{formatCurrency(p.amount)}</div>
                        </div>
                        <span className="ml-auto text-[10px] text-slate-500">{p.percent?.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ReportSection>
          </div>
        </>
      )}
    </div>
  );
};
