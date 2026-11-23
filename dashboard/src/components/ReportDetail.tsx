import { ArrowLeft, Check, Link2, Trash2 } from 'lucide-react';
import React, { useRef, useState } from 'react';
import type { ReportStatus } from '../api/types';
import { reportHref } from '../hooks/useReportRoute';
import { describeEnvironment, findTimeOrigin, formatClock, isWebUrl } from '../report/timeline';
import { buildTrace } from '../report/trace';
import type { ReportMedia, ReportView } from '../types';
import { useCopy } from './CodeBlock';
import { EventTrace } from './EventTrace';
import styles from './ReportDetail.module.css';
import { ReportLogs } from './ReportLogs';
import { ScreenshotGallery, VideoPlayer } from './ReportMedia';
import { STATUS_LABELS, StatusBadge, StatusGlyph, TypeBadge } from './StatusBadge';
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

/** One report: the title block and status, the facts, then the recording with its events beside the logs. */
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
  const video = report.attachments.find((attachment) => attachment.kind === 'video');
  const hasVideo = video !== undefined;
  const timeOrigin = findTimeOrigin(report);
  // Entries move the video only when there is one to move and the times are measured from its start.
  const canSeek = media.video.status === 'ready' && media.video.value !== null && report.recordingStartTime !== null;
  const trace = buildTrace(report, timeOrigin, video?.durationMs ? video.durationMs / 1000 : null);

  const seekVideo = (offsetSeconds: number) => {
    if (!canSeek || !videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, offsetSeconds);
    videoRef.current.play().catch((error: unknown) => {
      // The browser may refuse to start playing; the video still shows the frame it moved to.
      console.warn('The video did not start playing', error);
    });
  };

  return (
    <div className={`${ui.page} ${styles.page}`}>
      <ReportToolbar report={report} canDelete={canDelete} isSaving={isSaving} actionError={actionError} onBack={onBack} onDelete={onDelete} />
      <ReportHeader report={report} canChangeStatus={canChangeStatus} isSaving={isSaving} onStatusChange={onStatusChange} />

      <div className={styles.columns}>
        <section className={styles.mediaColumn} aria-label="Screen recording and screenshots">
          <div className={styles.columnHeading}>
            <h2 className={styles.columnTitle}>Recording</h2>
            {hasVideo && canSeek && (
              <span className={styles.clock}>
                {formatClock(currentTime)}{video?.durationMs ? ` / ${formatClock(video.durationMs / 1000)}` : ''}
              </span>
            )}
          </div>
          <VideoPlayer
            video={media.video}
            hasVideo={hasVideo}
            canSeek={canSeek}
            videoRef={videoRef}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
          />
          {trace && (
            <EventTrace trace={trace} currentTime={canSeek ? currentTime : null} canSeek={canSeek} onSeek={seekVideo} />
          )}
          <ScreenshotGallery screenshots={media.screenshots} />
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

interface ReportToolbarProps {
  report: ReportView;
  canDelete: boolean;
  isSaving: boolean;
  actionError: string | null;
  onBack: () => void;
  onDelete: () => void;
}

const ReportToolbar: React.FC<ReportToolbarProps> = ({ report, canDelete, isSaving, actionError, onBack, onDelete }) => {
  const { isCopied, copy } = useCopy();
  return (
    <div className={styles.toolbar}>
      <button type="button" className={ui.buttonGhost} onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        All reports
      </button>
      <div className={styles.actions}>
        {actionError && <span role="alert" className={styles.actionError}>{actionError}</span>}
        <button type="button" className={ui.button} onClick={() => copy(reportHref(report.id))}>
          {isCopied ? <Check size={15} strokeWidth={1.75} aria-hidden="true" /> : <Link2 size={15} strokeWidth={1.75} aria-hidden="true" />}
          {isCopied ? 'Link copied' : 'Copy link'}
        </button>
        {/* The server checks the role too; this only hides what the user cannot do. */}
        {canDelete && (
          <button
            type="button"
            className={ui.buttonDanger}
            disabled={isSaving}
            onClick={() => {
              if (window.confirm('Delete this report and all its files?')) onDelete();
            }}
          >
            <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

interface ReportHeaderProps {
  report: ReportView;
  canChangeStatus: boolean;
  isSaving: boolean;
  onStatusChange: (newStatus: ReportStatus) => void;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ report, canChangeStatus, isSaving, onStatusChange }) => {
  const environment = describeEnvironment(report.environment);
  return (
    <header className={styles.header}>
      <div className={styles.meta}>
        <TypeBadge type={report.type} />
        <span>{report.projectName}</span>
        <time dateTime={report.createdAt}>{dateFormat.format(new Date(report.createdAt))}</time>
      </div>
      <h1 className={styles.title}>{report.title}</h1>
      <p className={report.description ? styles.description : `${styles.description} ${ui.muted}`}>
        {report.description || 'No description'}
      </p>

      <div className={styles.statusRow}>
        <span id="report-status-label" className={styles.statusLabel}>Status</span>
        {canChangeStatus ? (
          <StatusChoice status={report.status} isSaving={isSaving} onChange={onStatusChange} />
        ) : (
          <StatusBadge status={report.status} />
        )}
      </div>

      <dl className={styles.facts}>
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

interface StatusChoiceProps {
  status: ReportStatus;
  isSaving: boolean;
  onChange: (newStatus: ReportStatus) => void;
}

/** The four statuses side by side; the arrow keys move between them, as in any radio group. */
const StatusChoice: React.FC<StatusChoiceProps> = ({ status, isSaving, onChange }) => {
  const moveWithArrows = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0 || isSaving) return;
    event.preventDefault();
    const nextIndex = (STATUS_OPTIONS.indexOf(status) + step + STATUS_OPTIONS.length) % STATUS_OPTIONS.length;
    onChange(STATUS_OPTIONS[nextIndex]);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons[nextIndex]?.focus();
  };

  return (
    <div role="radiogroup" aria-labelledby="report-status-label" className={ui.segmented} onKeyDown={moveWithArrows}>
      {STATUS_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === status}
          tabIndex={option === status ? 0 : -1}
          className={ui.segment}
          // Not disabled while saving, so the focused option keeps the focus through the change.
          aria-disabled={isSaving}
          onClick={() => {
            if (!isSaving && option !== status) onChange(option);
          }}
        >
          <StatusGlyph status={option} isLabelled />
          {STATUS_LABELS[option]}
        </button>
      ))}
    </div>
  );
};
