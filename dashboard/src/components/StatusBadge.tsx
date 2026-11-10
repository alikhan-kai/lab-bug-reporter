import React from 'react';
import type { ReportStatus } from '../api/types';

const STATUS_LOOK: Record<ReportStatus, { label: string; color: string; background: string; border: string }> = {
  new: { label: 'Новый', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.25)' },
  in_progress: { label: 'В работе', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)' },
  resolved: { label: 'Решено', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)' },
  wont_fix: { label: 'Отклонено', color: '#94a3b8', background: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.25)' },
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
