import React from 'react';
import type { ReportStatus, ReportType } from '../api/types';
import styles from './Badges.module.css';

export const STATUS_LABELS: Record<ReportStatus, string> = {
  new: 'New',
  in_progress: 'In progress',
  resolved: 'Resolved',
  wont_fix: "Won't fix",
};

export const TYPE_LABELS: Record<ReportType, string> = { bug: 'Bug', feature: 'Feature', question: 'Question' };

/**
 * The status as a small shape, so it reads without colour too: an empty ring is new, a half-filled one is in
 * progress, a filled one with a tick is resolved and a crossed-out one will not be fixed.
 * With `isLabelled` a visible name sits beside it and the shape is decoration; without it the shape names the status.
 */
export const StatusGlyph: React.FC<{ status: ReportStatus; size?: number; isLabelled?: boolean }> = ({ status, size = 14, isLabelled = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    className={`${styles.glyph} ${styles[status]}`}
    {...(isLabelled ? { 'aria-hidden': true } : { role: 'img', 'aria-label': STATUS_LABELS[status] })}
  >
    {status === 'resolved' ? (
      <>
        <circle cx="8" cy="8" r="6.25" fill="currentColor" />
        <path d="M5.3 8.2l1.8 1.8 3.6-3.8" fill="none" stroke="var(--color-canvas)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    )}
    {status === 'in_progress' && <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" />}
    {status === 'wont_fix' && <path d="M4.2 11.8l7.6-7.6" stroke="currentColor" strokeWidth="1.5" />}
  </svg>
);

/** The status shape with its name, the same in the list and the detail view. */
export const StatusBadge: React.FC<{ status: ReportStatus }> = ({ status }) => (
  <span className={styles.status}>
    <StatusGlyph status={status} isLabelled />
    {STATUS_LABELS[status]}
  </span>
);

/** The report type as a quiet mono word. */
export const TypeBadge: React.FC<{ type: ReportType }> = ({ type }) => (
  <span className={styles.type}>{TYPE_LABELS[type].toLowerCase()}</span>
);
