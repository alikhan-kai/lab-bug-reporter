/** Settings that differ between environments. Override them with VITE_* variables. */
export const config = {
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8081',
  keycloakRealm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'lab-bug-reporter',
  keycloakClientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'lab-dashboard',
  // Relative, because the service serves the dashboard and the API from one origin; Vite proxies it in dev.
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
};
