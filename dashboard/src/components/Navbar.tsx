import { Moon, Sun } from 'lucide-react';
import React from 'react';
import { useCurrentUser } from '../auth/AuthProvider';
import { useTheme } from '../hooks/useTheme';
import { signOut } from '../auth/keycloak';
import type { CurrentUser } from '../api/types';

interface NavbarProps {
  currentProject: string;
  onProjectChange: (project: string) => void;
  onHomeClick: () => void;
}

// The dashboard shows only the strongest role; roles come from the server in this order.
function describeRole(user: CurrentUser): string {
  return user.roles[0] ?? 'no role';
}

function initialsOf(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export const Navbar: React.FC<NavbarProps> = ({ currentProject, onProjectChange, onHomeClick }) => {
  const user = useCurrentUser();
  const { theme, toggleTheme } = useTheme();

  return (
    // On a phone the user block wraps under the logo instead of pushing the page wider than the screen.
    <header style={{
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-line)',
      padding: '10px 16px',
      minHeight: '56px',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '10px 16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px 24px', flexWrap: 'wrap', minWidth: 0 }}>
        <button
          type="button"
          onClick={onHomeClick}
          aria-label="К списку отчетов"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0, color: 'inherit', font: 'inherit' }}
        >
          {/* Аккуратный логотип в стиле campus.codes */}
          <div style={{
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-on-accent)',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: '0 2px 8px var(--color-accent)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)', letterSpacing: '-0.2px' }}>
              campus.codes
            </span>
            <span style={{ color: 'var(--color-ink-muted)', fontSize: '13px' }}>/</span>
            <span style={{ fontSize: '13px', color: 'var(--color-ink-secondary)', fontWeight: 500 }}>
              bug-reporter
            </span>
          </div>
        </button>

        {/* Выпадающий список проектов */}
        <div style={{ position: 'relative', minWidth: 0, maxWidth: '100%' }}>
          <select
            aria-label="Проект"
            value={currentProject}
            onChange={(e) => onProjectChange(e.target.value)}
            style={{
              background: 'var(--color-muted)',
              border: '1px solid var(--color-line)',
              color: 'var(--color-ink-secondary)',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
              maxWidth: '100%',
              transition: 'border-color 0.2s'
            }}
          >
            <option value="all">Все доступные проекты</option>
            {user.projects.map(project => (
              <option key={project.slug} value={project.slug}>{project.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Пользователь команды (Keycloak User) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block' }}>
            {user.username}
          </span>
          <span style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            color: 'var(--color-accent)',
            letterSpacing: '0.5px'
          }}>
            {describeRole(user)}
          </span>
        </div>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--color-line)',
          border: '1px solid var(--color-ink-muted)',
          color: 'var(--color-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '12px'
        }}>
          {initialsOf(user.username)}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
          title={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-ink-secondary)',
            padding: '6px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex'
          }}
        >
          {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-line)',
            color: 'var(--color-ink-secondary)',
            borderRadius: '6px',
            padding: '5px 10px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Выйти
        </button>
      </div>
    </header>
  );
};
