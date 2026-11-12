import { Bug, LogOut, Moon, Sun } from 'lucide-react';
import React from 'react';
import type { CurrentUser } from '../api/types';
import { useCurrentUser } from '../auth/AuthProvider';
import { signOut } from '../auth/keycloak';
import { useTheme } from '../hooks/useTheme';
import styles from './Navbar.module.css';
import ui from './ui.module.css';

interface NavbarProps {
  onHomeClick: () => void;
}

const ROLE_LABELS: Record<CurrentUser['roles'][number], string> = {
  admin: 'Администратор',
  triager: 'Разбирает отчеты',
  viewer: 'Только просмотр',
};

// The dashboard shows only the strongest role; roles come from the server in this order.
function describeRole(user: CurrentUser): string {
  const role = user.roles[0];
  return role ? ROLE_LABELS[role] : 'Без роли';
}

/** The top bar in the campus.codes layout: the wordmark, the one section, the user and the theme switch. */
export const Navbar: React.FC<NavbarProps> = ({ onHomeClick }) => {
  const user = useCurrentUser();
  const { theme, toggleTheme } = useTheme();
  const themeLabel = theme === 'dark' ? 'Светлая тема' : 'Темная тема';

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button type="button" className={styles.brand} onClick={onHomeClick} aria-label="Bug Reporter, к списку отчетов">
          <Bug size={24} className={styles.brandMark} aria-hidden="true" />
          <span>
            Bug<span className={styles.brandAccent}>Reporter</span>
          </span>
        </button>

        <nav className={styles.nav} aria-label="Разделы">
          <button type="button" className={styles.navLinkActive} aria-current="page" onClick={onHomeClick}>
            Отчеты
          </button>
        </nav>

        <div className={styles.user}>
          <div className={styles.userName}>
            <strong>{user.username}</strong>
            <span className={styles.role}>{describeRole(user)}</span>
          </div>
          <button type="button" className={ui.buttonGhost} onClick={() => void signOut()}>
            <LogOut size={16} aria-hidden="true" />
            Выйти
          </button>
          <button type="button" className={ui.iconButton} onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
};
