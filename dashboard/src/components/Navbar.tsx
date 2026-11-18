import { Moon, Sun } from 'lucide-react';
import React from 'react';
import type { CurrentUser } from '../api/types';
import { useCurrentUser } from '../auth/AuthProvider';
import { signOut } from '../auth/keycloak';
import { useTheme, type Theme } from '../hooks/useTheme';
import styles from './Navbar.module.css';
import ui from './ui.module.css';

interface NavbarProps {
  onHomeClick: () => void;
}

const ROLE_LABELS: Record<CurrentUser['roles'][number], string> = {
  admin: 'admin',
  triager: 'triager',
  viewer: 'viewer',
};

const THEME_OPTIONS: { theme: Theme; label: string; icon: React.ReactNode }[] = [
  { theme: 'light', label: 'Light theme', icon: <Sun size={15} strokeWidth={1.75} aria-hidden="true" /> },
  { theme: 'dark', label: 'Dark theme', icon: <Moon size={15} strokeWidth={1.75} aria-hidden="true" /> },
];

// The dashboard shows only the strongest role; roles come from the server in this order.
function describeRole(user: CurrentUser): string {
  const role = user.roles[0];
  return role ? ROLE_LABELS[role] : 'no role';
}

/** The ring mark of the wordmark, also the favicon. */
export const BrandMark: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <path d="M12 2.75v3.5M21.25 12h-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** The top bar: the wordmark, the one section, the user, the theme switch and sign-out. */
export const Navbar: React.FC<NavbarProps> = ({ onHomeClick }) => {
  const user = useCurrentUser();
  const { theme, setTheme } = useTheme();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button type="button" className={styles.brand} onClick={onHomeClick} aria-label="Lab Bug Reporter, back to the reports">
          <BrandMark />
          <span className={styles.brandName}>bug reporter</span>
          <span className={styles.brandScope}>/ lab</span>
        </button>

        <nav className={styles.nav} aria-label="Sections">
          <button type="button" className={styles.navLink} aria-current="page" onClick={onHomeClick}>
            <span className={styles.navDot} aria-hidden="true" />
            Reports
          </button>
        </nav>

        <div className={styles.user}>
          <div className={styles.userName}>
            <span className={styles.userLogin}>{user.username}</span>
            <span className={styles.role}>{describeRole(user)}</span>
          </div>
          <div role="group" aria-label="Theme" className={styles.themeSwitch}>
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.theme}
                type="button"
                className={styles.themeOption}
                aria-pressed={theme === option.theme}
                aria-label={option.label}
                title={option.label}
                onClick={() => setTheme(option.theme)}
              >
                {option.icon}
              </button>
            ))}
          </div>
          <button type="button" className={ui.buttonGhost} onClick={() => void signOut()}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
};
