import React from 'react';
import type { ReportStatus } from '../api/types';

const STATUS_LOOK: Record<ReportStatus, { label: string; color: string; background: string; border: string }> = {
  new: { label: 'Новый', color: 'var(--color-accent)', background: 'var(--color-accent-soft)', border: 'var(--color-accent)' },
  in_progress: { label: 'В работе', color: 'var(--color-warning)', background: 'var(--color-warning-soft)', border: 'var(--color-warning-line)' },
  resolved: { label: 'Решено', color: 'var(--color-success)', background: 'var(--color-success-soft)', border: 'var(--color-success-line)' },
  wont_fix: { label: 'Отклонено', color: 'var(--color-ink-secondary)', background: 'var(--color-muted)', border: 'var(--color-line)' },
};

/** The status of a report as a coloured pill, the same in the list and the detail view. */
export const StatusBadge: React.FC<{ status: ReportStatus }> = ({ status }) => {
  const look = STATUS_LOOK[status];
  return (
    <span style={{
      background: look.background,
      color: look.color,
      border: `1px solid ${look.border}`,
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.3px'
    }}>
      {look.label}
    </span>
  );
};
