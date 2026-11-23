import type { ReportView } from '../types';
import { formatClock, requestOutcomeOf } from './timeline';

export type TraceMarkKind = 'error' | 'failed' | 'click' | 'navigation';

export interface TraceMark {
  kind: TraceMarkKind;
  /** Seconds from the time origin; negative before the recording started. */
  offset: number;
  /** Where the mark sits on the bar, 0 to 100. */
  position: number;
  label: string;
}

export interface TraceAxisLabel {
  position: number;
  label: string;
}

/** The events of a report laid out on one bar, from the earliest event to the end of the video or the last event. */
export interface Trace {
  start: number;
  end: number;
  marks: TraceMark[];
  axis: TraceAxisLabel[];
  /** Where the recording starts on the bar; 0 when nothing happened before it. */
  recordingStart: number;
}

const AXIS_STEPS_SECONDS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
const AXIS_LABEL_COUNT = 5;

// A step that gives about five labels, so the axis stays readable for a 10-second and a 5-minute report alike.
function chooseAxisStep(span: number): number {
  return AXIS_STEPS_SECONDS.find((step) => span / step <= AXIS_LABEL_COUNT) ?? AXIS_STEPS_SECONDS[AXIS_STEPS_SECONDS.length - 1];
}

/**
 * Builds the event bar under the video: console errors, failed requests, clicks and page changes, each at its time
 * from `timeOrigin`. Returns null when there is nothing to draw.
 */
export function buildTrace(report: ReportView, timeOrigin: number | null, videoSeconds: number | null): Trace | null {
  if (timeOrigin === null) return null;
  const offsetOf = (time: number) => (time - timeOrigin) / 1000;

  const events: Omit<TraceMark, 'position'>[] = [
    ...report.console
      .filter((entry) => entry.level === 'error')
      .map((entry) => ({ kind: 'error' as const, offset: offsetOf(entry.t), label: `Console error: ${entry.message}` })),
    ...report.network
      .filter((entry) => requestOutcomeOf(entry) === 'failed')
      .map((entry) => ({ kind: 'failed' as const, offset: offsetOf(entry.t_start), label: `Failed request: ${entry.method} ${entry.url}` })),
    ...report.breadcrumbs
      .filter((entry) => entry.kind === 'click' || entry.kind === 'navigation')
      .map((entry) => ({
        kind: entry.kind === 'click' ? ('click' as const) : ('navigation' as const),
        offset: offsetOf(entry.t),
        label: entry.kind === 'click' ? `Click: ${entry.text || entry.target || ''}` : `Page: ${entry.url || ''}`,
      })),
  ].filter((event) => Number.isFinite(event.offset));

  if (events.length === 0) return null;

  const offsets = events.map((event) => event.offset);
  const start = Math.min(0, ...offsets);
  const end = Math.max(videoSeconds ?? 0, ...offsets, start + 1);
  const span = end - start;
  const positionOf = (offset: number) => ((offset - start) / span) * 100;

  const step = chooseAxisStep(span);
  const axis: TraceAxisLabel[] = [];
  for (let second = Math.ceil(start / step) * step; second <= end; second += step) {
    axis.push({ position: positionOf(second), label: formatClock(second) });
  }

  return {
    start,
    end,
    marks: events.map((event) => ({ ...event, position: positionOf(event.offset) })),
    axis,
    recordingStart: positionOf(0),
  };
}
