/**
 * Build-time settings. The Keycloak address is not here: the server sends it at startup
 * (`GET /api/v1/dashboard-config`), so one build works on any hostname.
 */
export const config = {
  // Relative, because the service serves the dashboard and the API from one origin; Vite proxies it in dev.
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
};
