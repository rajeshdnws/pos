import { DateRangeFilter, ReportPeriod } from '@rs-inventory/types';

/**
 * Resolved date range for DB queries.
 * gte = start of first day (00:00:00.000)
 * lte = end of last day (23:59:59.999)
 */
export interface ResolvedDateRange {
  gte: Date;
  lte: Date;
  startDateStr: string;
  endDateStr: string;
  label: string;
}

/**
 * Resolves a DateRangeFilter into concrete Date boundaries.
 * All boundaries are local calendar-day boundaries (start of day / end of day).
 */
export function resolveDateRange(filter?: DateRangeFilter): ResolvedDateRange {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  let gte: Date;
  let lte: Date;
  let label = 'Custom Range';

  const period: ReportPeriod = filter?.period ?? 'today';

  switch (period) {
    case 'today':
      gte = todayStart;
      lte = todayEnd;
      label = 'Today';
      break;

    case 'yesterday': {
      const yest = addDays(now, -1);
      gte = startOfDay(yest);
      lte = endOfDay(yest);
      label = 'Yesterday';
      break;
    }

    case 'this_week': {
      const dayOfWeek = now.getDay(); // 0=Sun
      const monday = addDays(now, -(dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      gte = startOfDay(monday);
      lte = todayEnd;
      label = 'This Week';
      break;
    }

    case 'this_month': {
      gte = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      lte = todayEnd;
      label = 'This Month';
      break;
    }

    case 'prev_month': {
      const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      gte = startOfDay(firstOfPrevMonth);
      lte = endOfDay(lastOfPrevMonth);
      label = 'Previous Month';
      break;
    }

    case 'this_year': {
      gte = startOfDay(new Date(now.getFullYear(), 0, 1));
      lte = todayEnd;
      label = 'This Year';
      break;
    }

    case 'prev_year': {
      const py = now.getFullYear() - 1;
      gte = startOfDay(new Date(py, 0, 1));
      lte = endOfDay(new Date(py, 11, 31));
      label = `Year ${py}`;
      break;
    }

    case 'custom':
    default: {
      if (filter?.startDate) {
        gte = startOfDay(parseLocalDate(filter.startDate));
      } else {
        gte = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      }
      if (filter?.endDate) {
        lte = endOfDay(parseLocalDate(filter.endDate));
      } else {
        lte = todayEnd;
      }
      label = 'Custom Range';
      break;
    }
  }

  return {
    gte,
    lte,
    startDateStr: toISODateStr(gte),
    endDateStr: toISODateStr(lte),
    label,
  };
}

/** Returns 0 instead of Infinity / NaN when dividing. */
export function safeDivide(numerator: number, denominator: number): number {
  if (!denominator || !isFinite(denominator)) return 0;
  const result = numerator / denominator;
  return isFinite(result) ? result : 0;
}

/** Round to 2 decimal places (half-up). */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Round a percentage to 2 decimal places. */
export function roundPercent(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Parse 'YYYY-MM-DD' as local calendar date without UTC offset shift. */
function parseLocalDate(str: string): Date {
  const [y, m, day] = str.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function toISODateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
