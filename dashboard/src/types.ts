import type { ReportDetail } from './api/types';

/** Captured context, in the shape the SDK sends it. */

export interface ConsoleEntry {
  t: number;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  stack?: string;
}

export interface NetworkEntry {
  t_start: number;
  duration_ms: number | null;
  method: string;
  url: string;
  status: number | null; // null для упавших или зависших запросов по ТЗ
  initiator: 'fetch' | 'xhr';
  pending?: boolean;     // флаг для зависших запросов
  request?: {
    headers: Record<string, string>;
    body: string;
    body_truncated: boolean;
  };
  response?: {
    headers: Record<string, string>;
    body: string;
    body_truncated: boolean;
  };
  error?: string | null;
}

export interface BreadcrumbEntry {
  t: number;
  kind: 'click' | 'navigation' | 'focus';
  target?: string;
  text?: string;
  url?: string;
}

export interface ReportContext {
  console: ConsoleEntry[];
  network: NetworkEntry[];
  breadcrumbs: BreadcrumbEntry[];
}

/** A report together with its captured context, as the detail view shows it. */
export type ReportView = ReportDetail & ReportContext;

/** The screenshots and the video of a report, loaded as blob URLs after the report itself. */
export type ReportMedia =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; videoUrl: string | null; screenshotUrls: string[] };
