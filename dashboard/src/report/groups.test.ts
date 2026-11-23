import { describe, expect, it } from 'vitest';
import type { ReportStatus, ReportSummary } from '../api/types';
import { groupReports } from './groups';

// Local times, so the test means the same day in any time zone.
const NOW = new Date(2026, 10, 18, 15, 0);

function report(id: string, status: ReportStatus, createdAt: Date): ReportSummary {
  return {
    id,
    projectSlug: 'demo',
    projectName: 'Demo',
    type: 'bug',
    title: id,
    status,
    pageUrl: 'http://localhost/',
    reporter: { id: null, email: null },
    hasVideo: false,
    screenshotCount: 0,
    consoleErrorCount: 0,
    failedRequestCount: 0,
    createdAt: createdAt.toISOString(),
  };
}

describe('groupReports', () => {
  it('names today, yesterday, recent weekdays and older dates', () => {
    const groups = groupReports([
      report('a', 'new', new Date(2026, 10, 18, 9, 0)),
      report('b', 'new', new Date(2026, 10, 17, 23, 30)),
      report('c', 'new', new Date(2026, 10, 16, 10, 0)),
      report('d', 'new', new Date(2026, 10, 2, 10, 0)),
      report('e', 'new', new Date(2025, 11, 30, 10, 0)),
    ], NOW);

    expect(groups.map((group) => [group.dayLabel, group.dateLabel])).toEqual([
      ['Today', '18 Nov'],
      ['Yesterday', '17 Nov'],
      ['Mon', '16 Nov'],
      ['', '2 Nov'],
      ['', '30 Dec 2025'],
    ]);
  });

  it('keeps reports of one day together and the order as given', () => {
    const groups = groupReports([
      report('a', 'new', new Date(2026, 10, 18, 14, 0)),
      report('b', 'new', new Date(2026, 10, 18, 9, 0)),
      report('c', 'new', new Date(2026, 10, 17, 9, 0)),
    ], NOW);

    expect(groups.map((group) => group.reports.map((item) => item.id))).toEqual([['a', 'b'], ['c']]);
    expect(groups.every((group) => group.status === null)).toBe(true);
  });

  it('starts a new run where the status changes on a mixed page', () => {
    const groups = groupReports([
      report('a', 'new', new Date(2026, 10, 18, 14, 0)),
      report('b', 'in_progress', new Date(2026, 10, 18, 13, 0)),
      report('c', 'in_progress', new Date(2026, 10, 18, 9, 0)),
    ], NOW);

    expect(groups.map((group) => [group.status, group.reports.length])).toEqual([['new', 1], ['in_progress', 2]]);
    expect(new Set(groups.map((group) => group.key)).size).toBe(groups.length);
  });
});
