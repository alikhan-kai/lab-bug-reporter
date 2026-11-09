export type ReportStatus = 'new' | 'in_progress' | 'resolved' | 'wont_fix';
export type ReportType = 'bug' | 'feature' | 'question';

export interface ConsoleEntry {
  t: number;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  stack?: string;
}

export interface NetworkEntry {
  t_start: number;
  duration_ms: number;
  method: string;
  url: string;
  status: number;
  initiator: 'fetch' | 'xhr';
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

export interface EnvironmentInfo {
  url: string;
  referrer: string;
  user_agent: string;
  browser: string;
  os: string;
  viewport: [number, number];
  screen_size: [number, number];
  device_pixel_ratio: number;
  language: string;
  timezone: string;
  client_time: string;
  online: boolean;
}

export interface ReportItem {
  id: string;
  projectSlug: string;
  projectName: string;
  type: ReportType;
  title: string;
  description: string;
  status: ReportStatus;
  createdAt: string;
  pageUrl: string;
  reporter: {
    id: string;
    email: string;
  };
  videoUrl?: string;
  screenshotUrl?: string;
  recordingStartTime?: number;
  environment: EnvironmentInfo;
  hostMetadata: Record<string, any>;
  console: ConsoleEntry[];
  network: NetworkEntry[];
  breadcrumbs: BreadcrumbEntry[];
}
