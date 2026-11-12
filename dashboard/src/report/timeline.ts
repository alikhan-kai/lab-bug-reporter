import type { NetworkEntry, ReportView } from '../types';

/** How a captured request ended. A request still waiting when the report was sent is not a failure. */
export type RequestOutcome = 'succeeded' | 'failed' | 'pending';

export function requestOutcomeOf(entry: NetworkEntry): RequestOutcome {
  if (entry.pending) return 'pending';
  if (entry.status === null || entry.status >= 400) return 'failed';
  return 'succeeded';
}

function formatDuration(milliseconds: number): string {
  return milliseconds < 1000 ? `${milliseconds} ms` : `${(milliseconds / 1000).toFixed(1)} s`;
}

export function describeRequestDuration(entry: NetworkEntry): string {
  if (entry.pending) return entry.duration_ms !== null ? `no response, ${formatDuration(entry.duration_ms)}` : 'no response';
  return entry.duration_ms !== null ? formatDuration(entry.duration_ms) : '—';
}

/** Seconds as m:ss, the way the video player shows time. */
export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = Math.floor(seconds % 60);
  return `${minutes}:${restSeconds < 10 ? '0' : ''}${restSeconds}`;
}

/**
 * The moment log times count from. With a video it is the recording start, so a time matches the video. Without
 * one it is the first captured event, so the entries still read as a timeline instead of all showing 0:00.
 */
export function findTimeOrigin(report: ReportView): number | null {
  if (report.recordingStartTime) return report.recordingStartTime;
  const times = [
    ...report.console.map((entry) => entry.t),
    ...report.network.map((entry) => entry.t_start),
    ...report.breadcrumbs.map((entry) => entry.t),
  ].filter(Number.isFinite);
  return times.length > 0 ? Math.min(...times) : null;
}

// Values come from the reporting website. Only web links become clickable, so a javascript: URL stays text.
export function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function describeEnvironment(environment: Record<string, unknown> | null): { platform: string; viewport: string } {
  const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
  const viewport = environment?.viewport;
  return {
    platform: [text(environment?.browser), text(environment?.os)].filter(Boolean).join(' · ') || '—',
    viewport: Array.isArray(viewport) && viewport.length === 2 ? `${viewport[0]} × ${viewport[1]}` : '—',
  };
}
