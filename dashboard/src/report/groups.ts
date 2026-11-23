import type { ReportStatus, ReportSummary } from '../api/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_DAYS = 6;

const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const dayWithYearFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Reports of one day in a row of the list, with the status they share when the page mixes statuses. */
export interface ReportGroup {
  key: string;
  /** Set only when the page holds more than one status, so the heading says which one this run is. */
  status: ReportStatus | null;
  /** Today, Yesterday or a weekday; empty for older days, which the date alone names. */
  dayLabel: string;
  dateLabel: string;
  reports: ReportSummary[];
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function describeDay(date: Date, now: Date): { dayLabel: string; dateLabel: string } {
  // Rounding absorbs the hour a daylight-saving change adds or removes.
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  const dateLabel = date.getFullYear() === now.getFullYear() ? dayFormat.format(date) : dayWithYearFormat.format(date);
  if (daysAgo === 0) return { dayLabel: 'Today', dateLabel };
  if (daysAgo === 1) return { dayLabel: 'Yesterday', dateLabel };
  if (daysAgo > 1 && daysAgo <= WEEKDAY_DAYS) return { dayLabel: weekdayFormat.format(date), dateLabel };
  return { dayLabel: '', dateLabel };
}

/**
 * Splits a page of reports into runs of the same local day, keeping the server's order. The server sorts by status
 * first, so on a page with several statuses a run also breaks where the status changes, and says its status.
 */
export function groupReports(reports: ReportSummary[], now: Date = new Date()): ReportGroup[] {
  const hasSeveralStatuses = new Set(reports.map((report) => report.status)).size > 1;
  const groups: ReportGroup[] = [];
  let lastRunKey: string | null = null;

  for (const report of reports) {
    const createdAt = new Date(report.createdAt);
    const status = hasSeveralStatuses ? report.status : null;
    const runKey = `${status ?? 'any'}-${startOfDay(createdAt)}`;
    if (runKey === lastRunKey) {
      groups[groups.length - 1].reports.push(report);
      continue;
    }
    // The same day can come back after another status, so the position keeps keys unique.
    groups.push({ key: `${runKey}-${groups.length}`, status, ...describeDay(createdAt, now), reports: [report] });
    lastRunKey = runKey;
  }
  return groups;
}
