import Keycloak from 'keycloak-js';
import type { DashboardConfig } from '../api/types';
import { config } from '../config';

// A token that expires sooner than this is refreshed before a request uses it.
const MIN_TOKEN_VALIDITY_SECONDS = 30;

// Created once the server has said where Keycloak is.
let keycloak: Keycloak | null = null;
let initialization: Promise<void> | null = null;

async function fetchDashboardConfig(): Promise<DashboardConfig> {
  const response = await fetch(`${config.apiBaseUrl}/dashboard-config`);
  if (!response.ok) {
    throw new Error(`Dashboard config request failed with status ${response.status}`);
  }
  return (await response.json()) as DashboardConfig;
}

async function initialize(): Promise<void> {
  const dashboardConfig = await fetchDashboardConfig();
  const instance = new Keycloak({
    url: dashboardConfig.keycloakUrl,
    realm: dashboardConfig.keycloakRealm,
    clientId: dashboardConfig.keycloakClientId,
  });
  await instance.init({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false });
  keycloak = instance;
}

function requireKeycloak(): Keycloak {
  if (!keycloak) {
    throw new Error('Not signed in');
  }
  return keycloak;
}

/**
 * Redirects to the Keycloak login page unless the user already has a session.
 * Keycloak can be initialized only once, so repeated calls share the first one.
 */
export function signIn(): Promise<void> {
  initialization ??= initialize();
  return initialization;
}

/** Returns a valid access token, refreshing it when it is about to expire. */
export async function getAccessToken(): Promise<string> {
  const instance = requireKeycloak();
  try {
    await instance.updateToken(MIN_TOKEN_VALIDITY_SECONDS);
  } catch {
    // The session has ended in Keycloak, so the user has to log in again.
    await instance.login();
  }
  if (!instance.token) {
    throw new Error('Not signed in');
  }
  return instance.token;
}

export function signOut(): Promise<void> {
  return requireKeycloak().logout({ redirectUri: window.location.origin });
}
