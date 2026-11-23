import React, { useState } from 'react';
import { api, describeError } from '../api/client';
import type { ReportStatus } from '../api/types';
import { useCurrentUser } from '../auth/AuthProvider';
import { canChangeStatus, canDeleteReports } from '../auth/permissions';
import { useReportMedia, useReportView } from '../hooks/useReportView';
import type { ReportView } from '../types';
import { ReportDetail } from './ReportDetail';
import styles from './ReportDetail.module.css';
import { Bone } from './Skeleton';
import ui from './ui.module.css';

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
      <div className={ui.page}>
        <div role="alert" className={ui.errorMessage}>
          <p className={styles.description}>{state.message}</p>
          <button type="button" className={ui.button} onClick={onBack}>All reports</button>
        </div>
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

// Shaped like the loaded report: the toolbar, the title block, the status, the facts, then the two columns.
const ReportDetailSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Loading the report" className={`${ui.page} ${styles.page}`}>
    <div className={styles.toolbar}>
      <Bone width={110} height={40} radius={8} />
      <Bone width={200} height={40} radius={8} />
    </div>
    <div className={styles.header}>
      <Bone width={260} height={12} />
      <div className={styles.title}><Bone width="55%" height={36} radius={6} /></div>
      <div className={styles.description}><Bone width="70%" height={15} /></div>
      <div className={styles.statusRow}><Bone width={420} height={42} radius={10} /></div>
      <div className={styles.facts}>
        <div><Bone width="70%" height={32} /></div>
        <div><Bone width="70%" height={32} /></div>
        <div><Bone width="70%" height={32} /></div>
      </div>
    </div>
    <div className={styles.columns}>
      <div className={styles.mediaColumn}><Bone width="100%" height={360} radius={12} /></div>
      <div className={styles.logs}><Bone width="100%" height={360} radius={12} /></div>
    </div>
  </div>
);
