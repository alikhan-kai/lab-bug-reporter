import React, { useState } from 'react';
import { api, describeError } from '../api/client';
import type { ReportStatus } from '../api/types';
import { useCurrentUser } from '../auth/AuthProvider';
import { canChangeStatus, canDeleteReports } from '../auth/permissions';
import { useReportMedia, useReportView } from '../hooks/useReportView';
import type { ReportView } from '../types';
import { ReportDetail } from './ReportDetail';
import { Bone, SkeletonStyles } from './Skeleton';

interface ReportDetailPageProps {
  reportId: string;
  onBack: () => void;
  onDeleted: () => void;
}

/** Loads one report and lets the user change its status or delete it, as far as their role allows. */
export const ReportDetailPage: React.FC<ReportDetailPageProps> = ({ reportId, onBack, onDeleted }) => {
  const { state, replaceReport } = useReportView(reportId);

  if (state.status === 'loading') {
    return <ReportDetailSkeleton />;
  }
  if (state.status === 'error') {
    return (
      <div role="alert" style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--color-danger)', fontSize: '14px' }}>
        <p style={{ margin: '0 0 16px' }}>{state.message}</p>
        <button type="button" onClick={onBack} style={backButtonStyle}>Вернуться к списку</button>
      </div>
    );
  }
  return <LoadedReport report={state.report} onBack={onBack} onDeleted={onDeleted} onReportChange={replaceReport} />;
};

interface LoadedReportProps {
  report: ReportView;
  onBack: () => void;
  onDeleted: () => void;
  onReportChange: (report: ReportView) => void;
}

const LoadedReport: React.FC<LoadedReportProps> = ({ report, onBack, onDeleted, onReportChange }) => {
  const user = useCurrentUser();
  const media = useReportMedia(report.id, report.attachments);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (action: () => Promise<void>) => {
    setIsSaving(true);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      console.error('Report action failed', error);
      setActionError(describeError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = (status: ReportStatus) => runAction(async () => {
    const updated = await api.updateReportStatus(report.id, status);
    onReportChange({ ...report, ...updated });
  });

  const handleDelete = () => runAction(async () => {
    await api.deleteReport(report.id);
    onDeleted();
  });

  return (
    <ReportDetail
      report={report}
      media={media}
      canChangeStatus={canChangeStatus(user)}
      canDelete={canDeleteReports(user)}
      isSaving={isSaving}
      actionError={actionError}
      onBack={onBack}
      onStatusChange={(status) => void handleStatusChange(status)}
      onDelete={() => void handleDelete()}
    />
  );
};

const backButtonStyle: React.CSSProperties = {
  background: 'var(--color-canvas)',
  border: '1px solid var(--color-line)',
  color: 'var(--color-ink-secondary)',
  padding: '7px 14px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px'
};

const ReportDetailSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Загрузка отчета" style={{ padding: '28px 16px', maxWidth: '1440px', margin: '0 auto', display: 'grid', gap: '24px' }}>
    <SkeletonStyles />
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Bone width={150} height={30} radius={6} />
      <Bone width={180} height={30} radius={6} />
    </div>
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: '10px', padding: '20px 24px', display: 'grid', gap: '12px' }}>
      <Bone width={280} height={14} />
      <Bone width="60%" height={22} />
      <Bone width="90%" height={14} />
      <Bone width="100%" height={56} radius={8} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '24px' }}>
      <Bone width="100%" height={360} radius={10} />
      <Bone width="100%" height={360} radius={10} />
    </div>
  </div>
);
