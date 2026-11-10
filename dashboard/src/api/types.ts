/** Types of the server's dashboard API. Keep them in sync with the DTOs in server/. */

export interface ApiError {
  status: number;
  error: string;
  message: string;
}

export type UserRole = 'admin' | 'triager' | 'viewer';

export interface VisibleProject {
  slug: string;
  name: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  email: string | null;
  roles: UserRole[];
  projects: VisibleProject[];
}

export type ReportStatus = 'new' | 'in_progress' | 'resolved' | 'wont_fix';
export type ReportType = 'bug' | 'feature' | 'question';

/** One page of a list. `page` starts at 0. */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** The website user who sent the report, as the website identified them. Unverified. */
export interface Reporter {
  id: string | null;
  email: string | null;
}

export interface ReportSummary {
  id: string;
  projectSlug: string;
  projectName: string;
  type: ReportType;
  title: string;
  status: ReportStatus;
  pageUrl: string;
  reporter: Reporter;
  hasVideo: boolean;
  screenshotCount: number;
  consoleErrorCount: number;
  failedRequestCount: number;
  createdAt: string;
}

export interface Attachment {
  id: string;
  kind: 'screenshot' | 'video';
  contentType: string;
  sizeBytes: number;
  durationMs: number | null;
  recordingStartTime: number | null;
}

export interface ReportDetail {
  id: string;
  projectSlug: string;
  projectName: string;
  type: ReportType;
  title: string;
  description: string | null;
  status: ReportStatus;
  pageUrl: string;
  reporter: Reporter;
  environment: Record<string, unknown> | null;
  hostMetadata: Record<string, unknown> | null;
  attachments: Attachment[];
  /** When the video started, in epoch milliseconds. Log times are shown relative to it. */
  recordingStartTime: number | null;
  consoleErrorCount: number;
  failedRequestCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Filters of the report list. `null` means any value. */
export interface ReportFilters {
  project: string | null;
  status: ReportStatus | null;
  type: ReportType | null;
  query: string;
}
