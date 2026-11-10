import Keycloak from 'keycloak-js';
import { config } from '../config';

// A token that expires sooner than this is refreshed before a request uses it.
const MIN_TOKEN_VALIDITY_SECONDS = 30;

const keycloak = new Keycloak({
  url: config.keycloakUrl,
  realm: config.keycloakRealm,
  clientId: config.keycloakClientId,
});

let initialization: Promise<void> | null = null;

/**
 * Redirects to the Keycloak login page unless the user already has a session.
 * Keycloak can be initialized only once, so repeated calls share the first one.
 */
export function signIn(): Promise<void> {
  initialization ??= keycloak
    .init({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false })
    .then(() => undefined);
  return initialization;
}

/** Returns a valid access token, refreshing it when it is about to expire. */
export async function getAccessToken(): Promise<string> {
  try {
    await keycloak.updateToken(MIN_TOKEN_VALIDITY_SECONDS);
  } catch {
    // The session has ended in Keycloak, so the user has to log in again.
    await keycloak.login();
  }
  if (!keycloak.token) {
    throw new Error('Not signed in');
  }
  return keycloak.token;
}

export function signOut(): Promise<void> {
  return keycloak.logout({ redirectUri: window.location.origin });
}
