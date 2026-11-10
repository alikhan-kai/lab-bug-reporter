import { getAccessToken } from '../auth/keycloak';
import { config } from '../config';
import type { ApiError, CurrentUser } from './types';

/** An API call that the server answered with an error status. */
export class ApiRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await getAccessToken()}`);

  const response = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers });
  if (!response.ok) {
    throw await toRequestError(response);
  }
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

export const api = {
  fetchCurrentUser: () => request<CurrentUser>('/me'),
};
