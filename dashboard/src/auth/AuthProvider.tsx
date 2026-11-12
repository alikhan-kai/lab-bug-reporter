import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { CurrentUser } from '../api/types';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import ui from '../components/ui.module.css';
import styles from './AuthError.module.css';
import { signIn, signOut } from './keycloak';

type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string; isAccessDenied: boolean }
  | { status: 'ready'; user: CurrentUser };

const CurrentUserContext = createContext<CurrentUser | null>(null);

function toErrorState(error: unknown): AuthState {
  if (error instanceof ApiRequestError && error.status === 403) {
    return {
      status: 'error',
      message: 'Your account has none of the admin, triager or viewer roles.',
      isAccessDenied: true,
    };
  }
  return {
    status: 'error',
    message: 'Cannot sign in. Check that Keycloak and the server are running.',
    isAccessDenied: false,
  };
}

/** Signs the user in through Keycloak and loads their roles and projects before rendering the dashboard. */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let isCancelled = false;
    signIn()
      .then(() => api.fetchCurrentUser())
      .then((user) => {
        if (!isCancelled) setState({ status: 'ready', user });
      })
      .catch((error: unknown) => {
        console.error('Dashboard sign-in failed', error);
        if (!isCancelled) setState(toErrorState(error));
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return <DashboardSkeleton />;
  }
  if (state.status === 'error') {
    return <AuthError message={state.message} isAccessDenied={state.isAccessDenied} />;
  }
  return <CurrentUserContext.Provider value={state.user}>{children}</CurrentUserContext.Provider>;
};

/** The signed-in team member. Only for components rendered inside {@link AuthProvider}. */
export function useCurrentUser(): CurrentUser {
  const user = useContext(CurrentUserContext);
  if (!user) {
    throw new Error('useCurrentUser must be used inside AuthProvider');
  }
  return user;
}

const AuthError: React.FC<{ message: string; isAccessDenied: boolean }> = ({ message, isAccessDenied }) => (
  <main className={styles.screen}>
    <section role="alert" className={`${ui.card} ${styles.box}`}>
      <h1 className={styles.title}>{isAccessDenied ? 'No access' : 'Sign-in failed'}</h1>
      <p className={styles.text}>{message}</p>
      <div className={styles.buttons}>
        {!isAccessDenied && (
          <button type="button" className={ui.buttonPrimary} onClick={() => window.location.reload()}>
            Try again
          </button>
        )}
        <button type="button" className={ui.button} onClick={() => void signOut()}>
          Sign in as another user
        </button>
      </div>
    </section>
  </main>
);
