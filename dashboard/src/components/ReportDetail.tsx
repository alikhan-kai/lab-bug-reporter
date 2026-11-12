import { ArrowLeft, Calendar, Check, FolderOpen, Link2, Trash2 } from 'lucide-react';
import React, { useRef, useState } from 'react';
import type { ReportStatus } from '../api/types';
import { reportHref } from '../hooks/useReportRoute';
import { describeEnvironment, findTimeOrigin, formatClock, isWebUrl } from '../report/timeline';
import type { ReportMedia, ReportView } from '../types';
import { useCopy } from './CodeBlock';
import styles from './ReportDetail.module.css';
import { ReportLogs } from './ReportLogs';
import { ScreenshotGallery, VideoPlayer } from './ReportMedia';
import { STATUS_LABELS, StatusBadge, TypeBadge } from './StatusBadge';
import ui from './ui.module.css';

const STATUS_OPTIONS: ReportStatus[] = ['new', 'in_progress', 'resolved', 'wont_fix'];

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

interface ReportDetailProps {
  report: ReportView;
  media: ReportMedia;
  canChangeStatus: boolean;
  canDelete: boolean;
  isSaving: boolean;
  actionError: string | null;
  onBack: () => void;
  onStatusChange: (newStatus: ReportStatus) => void;
  onDelete: () => void;
}

/** One report laid out like a campus.codes problem page: the title block, then the media beside the logs. */
export const ReportDetail: React.FC<ReportDetailProps> = ({
  report,
  media,
  canChangeStatus,
  canDelete,
  isSaving,
  actionError,
  onBack,
  onStatusChange,
  onDelete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const hasVideo = report.attachments.some((attachment) => attachment.kind === 'video');
  const timeOrigin = findTimeOrigin(report);
  // Entries move the video only when there is one to move and the times are measured from its start.
  const canSeek = media.video.status === 'ready' && media.video.value !== null && report.recordingStartTime !== null;

  const seekVideo = (offsetSeconds: number) => {
    if (!canSeek || !videoRef.current) return;
    videoRef.current.currentTime = offsetSeconds;
    videoRef.current.play().catch((error: unknown) => {
      // The browser may refuse to start playing; the video still shows the frame it moved to.
      console.warn('The video did not start playing', error);
    });
  };

  return (
    <div className={ui.page}>
      <ReportToolbar
        report={report}
        canChangeStatus={canChangeStatus}
        canDelete={canDelete}
        isSaving={isSaving}
        actionError={actionError}
        onBack={onBack}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />
      <ReportHeader report={report} />

      <div className={styles.columns}>
        <section className={`${ui.card} ${styles.panel}`} aria-label="Screen recording and screenshots">
          <div className={styles.panelHeader}>
            <span>Screen recording</span>
            {hasVideo && <span className={styles.clock}>{formatClock(currentTime)}</span>}
          </div>
          <div className={styles.panelBody}>
            <VideoPlayer
              video={media.video}
              hasVideo={hasVideo}
              canSeek={canSeek}
              videoRef={videoRef}
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
            />
            <ScreenshotGallery screenshots={media.screenshots} />
          </div>
        </section>

        <ReportLogs
          report={report}
          timeOrigin={timeOrigin}
          canSeek={canSeek}
          hasVideo={hasVideo}
          currentTime={currentTime}
          onSeek={seekVideo}
        />
      </div>
    </div>
  );
};

type ReportToolbarProps = Omit<ReportDetailProps, 'media'>;

const ReportToolbar: React.FC<ReportToolbarProps> = ({
  report,
  canChangeStatus,
  canDelete,
  isSaving,
  actionError,
  onBack,
  onStatusChange,
  onDelete,
}) => {
  const { isCopied, copy } = useCopy();
  return (
    <div className={styles.toolbar}>
      <button type="button" className={ui.buttonGhost} onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        All reports
      </button>

      <div className={styles.actions}>
        {actionError && <span role="alert" className={styles.actionError}>{actionError}</span>}

        <button type="button" className={ui.button} onClick={() => copy(reportHref(report.id))}>
          {isCopied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
          {isCopied ? 'Link copied' : 'Copy link'}
        </button>

        {/* The server checks the role too; this only hides what the user cannot do. */}
        <div className={styles.statusControl}>
          {canChangeStatus ? (
            <>
              <label htmlFor="report-status">Status</label>
              <select
                id="report-status"
                className={ui.select}
                value={report.status}
                disabled={isSaving}
                onChange={(event) => onStatusChange(event.target.value as ReportStatus)}
              >
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
              </select>
            </>
          ) : (
            <StatusBadge status={report.status} />
          )}
        </div>

        {canDelete && (
          <button
            type="button"
            className={ui.buttonDanger}
            disabled={isSaving}
            onClick={() => {
              if (window.confirm('Delete this report and all its files?')) onDelete();
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

const ReportHeader: React.FC<{ report: ReportView }> = ({ report }) => {
  const environment = describeEnvironment(report.environment);
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{report.title}</h1>
        <div className={styles.meta}>
          <TypeBadge type={report.type} />
          <span className={styles.metaItem}>
            <FolderOpen size={14} aria-hidden="true" />
            {report.projectName}
          </span>
          <span className={styles.metaItem}>
            <Calendar size={14} aria-hidden="true" />
            <time dateTime={report.createdAt}>{dateFormat.format(new Date(report.createdAt))}</time>
          </span>
        </div>
      </div>

      <p className={report.description ? styles.description : `${styles.description} ${ui.muted}`}>
        {report.description || 'No description'}
      </p>

      <dl className={`${ui.card} ${styles.facts}`}>
        <div>
          <dt>Reporter</dt>
          <dd>{report.reporter.email ?? report.reporter.id ?? 'Not given'}</dd>
        </div>
        <div>
          <dt>Page</dt>
          <dd>
            {isWebUrl(report.pageUrl)
              ? <a href={report.pageUrl} target="_blank" rel="noreferrer" className={ui.link}>{report.pageUrl}</a>
              : report.pageUrl}
          </dd>
        </div>
        <div>
          <dt>Browser and OS</dt>
          <dd>{environment.platform}</dd>
        </div>
        <div>
          <dt>Viewport</dt>
          <dd>{environment.viewport}</dd>
        </div>
        <div>
          <dt>Report ID</dt>
          <dd className={ui.mono}>{report.id}</dd>
        </div>
      </dl>
    </header>
  );
};
