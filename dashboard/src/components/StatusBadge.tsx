import { Bug, CircleHelp, Lightbulb, type LucideIcon } from 'lucide-react';
import React from 'react';
import type { ReportStatus, ReportType } from '../api/types';
import styles from './Badges.module.css';
import ui from './ui.module.css';

export const STATUS_LABELS: Record<ReportStatus, string> = {
  new: 'New',
  in_progress: 'In progress',
  resolved: 'Resolved',
  wont_fix: "Won't fix",
};

export const TYPE_LABELS: Record<ReportType, string> = { bug: 'Bug', feature: 'Feature', question: 'Question' };

export const TYPE_ICONS: Record<ReportType, LucideIcon> = { bug: Bug, feature: Lightbulb, question: CircleHelp };

/** The status of a report as a coloured pill, the same in the list and the detail view. */
export const StatusBadge: React.FC<{ status: ReportStatus }> = ({ status }) => (
  <span className={`${styles.status} ${styles[status]}`}>{STATUS_LABELS[status]}</span>
);

/** The report type with its icon. `iconOnly` keeps the label for screen readers and the tooltip. */
export const TypeBadge: React.FC<{ type: ReportType; iconOnly?: boolean }> = ({ type, iconOnly = false }) => {
  const Icon = TYPE_ICONS[type];
  return (
    <span className={`${styles.type} ${styles[type]}`} title={TYPE_LABELS[type]}>
      <Icon size={iconOnly ? 16 : 14} aria-hidden="true" />
      {iconOnly ? <span className={ui.visuallyHidden}>{TYPE_LABELS[type]}</span> : TYPE_LABELS[type]}
    </span>
  );
};
