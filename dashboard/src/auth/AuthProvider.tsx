import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, ApiRequestError } from '../api/client';
import type { CurrentUser } from '../api/types';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
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
      message: 'У вашей учётной записи нет роли admin, triager или viewer.',
      isAccessDenied: true,
    };
  }
  return {
    status: 'error',
    message: 'Не удалось войти. Проверьте, что Keycloak и сервер запущены.',
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

const buttonStyle: React.CSSProperties = {
  background: 'var(--color-line)',
  border: '1px solid var(--color-ink-muted)',
  color: 'var(--color-ink)',
  borderRadius: '6px',
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
};

const AuthError: React.FC<{ message: string; isAccessDenied: boolean }> = ({ message, isAccessDenied }) => (
  <main style={{
    minHeight: '100vh',
    background: 'var(--color-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  }}>
    <section role="alert" style={{
      maxWidth: '420px',
      width: '100%',
      background: 'var(--color-canvas)',
      border: '1px solid var(--color-line)',
      borderRadius: '8px',
      padding: '24px',
      color: 'var(--color-ink)',
    }}>
      <h1 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>
        {isAccessDenied ? 'Нет доступа' : 'Ошибка входа'}
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-ink-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>{message}</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {!isAccessDenied && (
          <button type="button" style={buttonStyle} onClick={() => window.location.reload()}>
            Повторить
          </button>
        )}
        <button type="button" style={buttonStyle} onClick={() => void signOut()}>
          Войти под другим пользователем
        </button>
      </div>
    </section>
  </main>
);
