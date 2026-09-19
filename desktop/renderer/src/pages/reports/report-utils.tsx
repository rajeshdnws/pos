import React from 'react';
import { Calendar } from 'lucide-react';

export type ReportPeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'prev_month'
  | 'this_year'
  | 'prev_year'
  | 'custom';

export type PeriodOption = {
  value: ReportPeriod;
  label: string;
};

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'prev_month', label: 'Previous Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'prev_year', label: 'Previous Year' },
  { value: 'custom', label: 'Custom Range' },
];

interface DateRangeFilterProps {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  onPeriodChange: (period: ReportPeriod) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApply: () => void;
  loading?: boolean;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  period,
  startDate,
  endDate,
  onPeriodChange,
  onStartDateChange,
  onEndDateChange,
  onApply,
  loading,
}) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <select
          value={period}
          onChange={(e) => {
            onPeriodChange(e.target.value as ReportPeriod);
            if (e.target.value !== 'custom') {
              setTimeout(onApply, 50);
            }
          }}
          className="bg-surface-900 border border-surface-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 pr-6"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {period === 'custom' && (
        <>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-surface-900 border border-surface-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-surface-900 border border-surface-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
          />
          <button
            onClick={onApply}
            disabled={loading}
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Apply
          </button>
        </>
      )}
    </div>
  );
};

// ── Shared formatting helpers ─────────────────────────────────────────────────

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number | null | undefined, decimals = 2): string => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return `${value >= 0 ? '' : ''}${value.toFixed(2)}%`;
};

export const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value: Date | string | null | undefined): string => {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Shared UI primitives ──────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: { value: string; positive: boolean };
  warning?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, icon, iconBg, trend, warning }) => (
  <div className="bg-surface-900/60 border border-surface-800 rounded-xl p-4 flex flex-col gap-3">
    <div className="flex items-start justify-between gap-2">
      <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg ?? 'bg-brand-500/10 border-brand-500/20 text-brand-400'}`}>
        {icon}
      </div>
      {trend && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${trend.positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {trend.value}
        </span>
      )}
    </div>
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      {warning && (
        <div className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
          <span className="shrink-0">⚠</span>
          <span>{warning}</span>
        </div>
      )}
    </div>
  </div>
);

interface ReportSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export const ReportSection: React.FC<ReportSectionProps> = ({ title, subtitle, children, action }) => (
  <div className="bg-surface-900/40 border border-surface-800 rounded-xl overflow-hidden">
    <div className="flex items-center justify-between px-5 py-3 border-b border-surface-800">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

interface TableProps {
  headers: string[];
  rows: React.ReactNode[][];
  loading?: boolean;
  emptyMessage?: string;
}

export const ReportTable: React.FC<TableProps> = ({ headers, rows, loading, emptyMessage }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 text-xs gap-2">
        <div className="h-4 w-4 border-2 border-slate-600 border-t-brand-400 rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-surface-700">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-slate-500">
                {emptyMessage ?? 'No data for selected period'}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-surface-800/60 hover:bg-surface-800/30 transition-colors"
              >
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-slate-300 whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

interface AlertBannerProps {
  type: 'warning' | 'info' | 'error';
  message: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ type, message }) => {
  const styles = {
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
    error: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
  };
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-xs ${styles[type]}`}>
      <span className="shrink-0 mt-0.5">⚠</span>
      <span>{message}</span>
    </div>
  );
};

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
    <div className="h-8 w-8 border-2 border-slate-700 border-t-brand-400 rounded-full animate-spin" />
    <span className="text-xs">{message}</span>
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
      <span className="text-rose-400 text-lg">✕</span>
    </div>
    <p className="text-xs text-slate-400 max-w-sm text-center">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs rounded-lg border border-surface-700 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

/** Use this to paginate table data client-side */
export function usePagination<T>(data: T[], pageSize = 20) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paginated = data.slice((page - 1) * pageSize, page * pageSize);

  return { page, setPage, totalPages, paginated };
}

export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}> = ({ page, totalPages, total, onPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 border-t border-surface-800 mt-3">
      <span className="text-[10px] text-slate-500">{total.toLocaleString()} records</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="px-2 py-1 text-xs rounded border border-surface-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        <span className="text-xs text-slate-400 px-1">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="px-2 py-1 text-xs rounded border border-surface-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>
    </div>
  );
};
