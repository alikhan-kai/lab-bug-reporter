import { getAccessToken } from '../auth/keycloak';
import { config } from '../config';
import type { ReportContext } from '../types';
import type { ApiError, CurrentUser, Page, ReportDetail, ReportFilters, ReportStatus, ReportSummary } from './types';

export const REPORT_PAGE_SIZE = 20;

/** An API call that the server answered with an error status. */
export class ApiRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await getAccessToken()}`);

  const response = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers });
  if (!response.ok) {
    throw await toRequestError(response);
  }
  return response;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await send(path, init);
  return (await response.json()) as T;
}

async function toRequestError(response: Response): Promise<ApiRequestError> {
  try {
    const body = (await response.json()) as ApiError;
    return new ApiRequestError(response.status, body.message);
  } catch {
    // A proxy or an unreachable server answers without the API's JSON body.
    return new ApiRequestError(response.status, response.statusText || 'Request failed');
  }
}

function toReportQuery(filters: ReportFilters, page: number): string {
  const query = new URLSearchParams({ page: String(page), size: String(REPORT_PAGE_SIZE) });
  if (filters.project) query.set('project', filters.project);
  if (filters.status) query.set('status', filters.status);
  if (filters.type) query.set('type', filters.type);
  if (filters.query.trim()) query.set('q', filters.query.trim());
  return query.toString();
}

const jsonBody = (body: unknown): RequestInit => ({
  body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
});

export const api = {
  fetchCurrentUser: () => request<CurrentUser>('/me'),

  fetchReports: (filters: ReportFilters, page: number) =>
    request<Page<ReportSummary>>(`/reports?${toReportQuery(filters, page)}`),

  fetchReport: (reportId: string) => request<ReportDetail>(`/reports/${encodeURIComponent(reportId)}`),

  fetchReportContext: (reportId: string) =>
    request<Partial<ReportContext>>(`/reports/${encodeURIComponent(reportId)}/context`),

  // <img> and <video> cannot send the bearer token, so the file is fetched here and shown from a blob URL.
  fetchAttachment: async (reportId: string, attachmentId: string): Promise<Blob> => {
    const response = await send(`/reports/${encodeURIComponent(reportId)}/attachments/${encodeURIComponent(attachmentId)}`);
    return response.blob();
  },

  updateReportStatus: (reportId: string, status: ReportStatus) =>
    request<ReportDetail>(`/reports/${encodeURIComponent(reportId)}`, { method: 'PATCH', ...jsonBody({ status }) }),

  deleteReport: async (reportId: string): Promise<void> => {
    await send(`/reports/${encodeURIComponent(reportId)}`, { method: 'DELETE' });
  },
};

/** A message for the user. The API's own message is shown only for errors it answers on purpose. */
export function describeError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 404) return 'Отчёт не найден или у вас нет доступа к его проекту.';
    if (error.status === 403) return 'Вашей роли это действие недоступно.';
    if (error.status >= 500) return 'Сервер не смог выполнить запрос. Попробуйте ещё раз.';
    return error.message;
  }
  return 'Не удалось связаться с сервером. Проверьте подключение.';
}
