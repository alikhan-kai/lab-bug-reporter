import React from 'react';
import { useCurrentUser } from '../auth/AuthProvider';
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

  return (
    <header style={{
      background: '#090d16',
      borderBottom: '1px solid #1e293b',
      padding: '0 28px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div 
          onClick={onHomeClick}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          {/* Аккуратный логотип в стиле campus.codes */}
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#f8fafc', letterSpacing: '-0.2px' }}>
              campus.codes
            </span>
            <span style={{ color: '#475569', fontSize: '13px' }}>/</span>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
              bug-reporter
            </span>
          </div>
        </div>

        {/* Выпадающий список проектов */}
        <div style={{ position: 'relative' }}>
          <select
            aria-label="Проект"
            value={currentProject}
            onChange={(e) => onProjectChange(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              color: '#cbd5e1',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', display: 'block' }}>
            {user.username}
          </span>
          <span style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#38bdf8',
            letterSpacing: '0.5px'
          }}>
            {describeRole(user)}
          </span>
        </div>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#1e293b',
          border: '1px solid #334155',
          color: '#38bdf8',
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
          onClick={() => void signOut()}
          style={{
            background: 'transparent',
            border: '1px solid #1e293b',
            color: '#94a3b8',
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
