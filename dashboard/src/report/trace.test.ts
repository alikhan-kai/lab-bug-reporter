import { describe, expect, it } from 'vitest';
import type { ReportView } from '../types';
import { buildTrace } from './trace';

const ORIGIN = 1_700_000_000_000;

function reportWith(parts: Partial<Pick<ReportView, 'console' | 'network' | 'breadcrumbs'>>): ReportView {
  return { console: [], network: [], breadcrumbs: [], ...parts } as ReportView;
}

describe('buildTrace', () => {
  it('places errors, failed requests, clicks and page changes on the bar', () => {
    const trace = buildTrace(reportWith({
      console: [
        { t: ORIGIN + 4000, level: 'error', message: 'TypeError' },
        { t: ORIGIN + 5000, level: 'log', message: 'ignored' },
      ],
      network: [
        { t_start: ORIGIN + 9000, duration_ms: 20, method: 'GET', url: '/api', status: 500, initiator: 'fetch' },
        { t_start: ORIGIN + 2000, duration_ms: 20, method: 'GET', url: '/ok', status: 200, initiator: 'fetch' },
      ],
      breadcrumbs: [
        { t: ORIGIN - 5000, kind: 'navigation', url: '/login' },
        { t: ORIGIN + 12000, kind: 'click', text: 'Next week' },
        { t: ORIGIN + 13000, kind: 'focus', target: 'input' },
      ],
    }), ORIGIN, 48);

    expect(trace).not.toBeNull();
    expect(trace!.start).toBe(-5);
    expect(trace!.end).toBe(48);
    expect(trace!.marks.map((mark) => [mark.kind, mark.offset])).toEqual([
      ['error', 4],
      ['failed', 9],
      ['navigation', -5],
      ['click', 12],
    ]);
    expect(trace!.marks.find((mark) => mark.kind === 'navigation')!.position).toBe(0);
    expect(trace!.recordingStart).toBeCloseTo((5 / 53) * 100);
  });

  it('labels the axis with round times that fit the length', () => {
    const trace = buildTrace(reportWith({ console: [{ t: ORIGIN + 1000, level: 'error', message: 'x' }] }), ORIGIN, 48);

    expect(trace!.axis.map((label) => label.label)).toEqual(['0:00', '0:10', '0:20', '0:30', '0:40']);
  });

  it('draws nothing without events or without a time origin', () => {
    expect(buildTrace(reportWith({}), ORIGIN, 10)).toBeNull();
    expect(buildTrace(reportWith({ console: [{ t: ORIGIN, level: 'error', message: 'x' }] }), null, 10)).toBeNull();
  });
});
