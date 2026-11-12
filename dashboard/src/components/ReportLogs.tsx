import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { describeRequestDuration, formatClock, requestOutcomeOf, type RequestOutcome } from '../report/timeline';
import type { ConsoleEntry, NetworkEntry, ReportView } from '../types';
import { CodeBlock } from './CodeBlock';
import styles from './ReportDetail.module.css';
import ui from './ui.module.css';

type LogTab = 'network' | 'console' | 'actions' | 'environment';
type ConsoleFilter = 'all' | 'error' | 'warn';

interface ReportLogsProps {
  report: ReportView;
  timeOrigin: number | null;
  /** Whether entries move the video: only with a video and times measured from its start. */
  canSeek: boolean;
  hasVideo: boolean;
  currentTime: number;
  onSeek: (offsetSeconds: number) => void;
}

/** What the page did around the bug, in tabs, each entry timed so it can be matched with the video. */
export const ReportLogs: React.FC<ReportLogsProps> = ({ report, timeOrigin, canSeek, hasVideo, currentTime, onSeek }) => {
  const [activeTab, setActiveTab] = useState<LogTab>('network');

  // Events from before the recording keep a negative time, so they do not all read as 0:00 and light up with it.
  const timeline: Timeline = {
    offsetOf: (time) => (timeOrigin === null ? 0 : (time - timeOrigin) / 1000),
    isPlayingAt: (offset) => canSeek && offset >= 0 && Math.abs(currentTime - offset) < 1.5,
    canSeek,
    onSeek: (offset) => onSeek(Math.max(0, offset)),
  };

  const tabs: { id: LogTab; label: string; count?: number }[] = [
    { id: 'network', label: 'Network', count: report.network.length },
    { id: 'console', label: 'Console', count: report.console.length },
    { id: 'actions', label: 'Actions', count: report.breadcrumbs.length },
    { id: 'environment', label: 'Environment' },
  ];

  return (
    <section className={`${ui.card} ${styles.panel} ${styles.logs}`} aria-label="Captured data">
      <div role="tablist" aria-label="Captured data" className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && <span className={styles.tabCount}>{tab.count}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" className={styles.tabPanel}>
        {activeTab !== 'environment' && timeOrigin !== null && (
          <p className={styles.timeNote}>
            {canSeek
              ? 'Times from the start of the recording. Click an event to jump to it.'
              : hasVideo
                ? 'Times from the start of the recording.'
                : 'No video, so times count from the first captured event.'}
          </p>
        )}
        {activeTab === 'network' && <NetworkTab entries={report.network} timeline={timeline} />}
        {activeTab === 'console' && <ConsoleTab entries={report.console} timeline={timeline} />}
        {activeTab === 'actions' && <ActionsTab report={report} timeline={timeline} />}
        {activeTab === 'environment' && (
          <div className={styles.environment}>
            <CodeBlock title="environment" content={JSON.stringify(report.environment ?? {}, null, 2)} />
            <CodeBlock title="host metadata" content={JSON.stringify(report.hostMetadata ?? {}, null, 2)} />
          </div>
        )}
      </div>
    </section>
  );
};

interface Timeline {
  offsetOf: (time: number) => number;
  isPlayingAt: (offset: number) => boolean;
  canSeek: boolean;
  onSeek: (offset: number) => void;
}

interface TimedEntryProps {
  time: number;
  timeline: Timeline;
  stateClass?: string;
  children: React.ReactNode;
}

// An entry that moves the video works like a button, also from the keyboard.
const TimedEntry: React.FC<TimedEntryProps> = ({ time, timeline, stateClass, children }) => {
  const offset = timeline.offsetOf(time);
  const className = [
    timeline.canSeek ? styles.entrySeekable : styles.entry,
    timeline.isPlayingAt(offset) ? styles.entryPlaying : stateClass,
  ].filter(Boolean).join(' ');

  if (!timeline.canSeek) {
    return <div className={className}>{children}</div>;
  }
  return (
    <div
      className={className}
      role="button"
      tabIndex={0}
      onClick={() => timeline.onSeek(offset)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          timeline.onSeek(offset);
        }
      }}
    >
      {children}
    </div>
  );
};

const EntryTime: React.FC<{ time: number; timeline: Timeline }> = ({ time, timeline }) => (
  <span className={styles.entryTime}>{formatClock(timeline.offsetOf(time))}</span>
);

/** A button that opens an entry's details without moving the video. */
const ExpandButton: React.FC<{ isExpanded: boolean; label: string; onToggle: () => void }> = ({ isExpanded, label, onToggle }) => (
  <button
    type="button"
    className={`${ui.buttonGhost} ${ui.buttonSmall}`}
    aria-expanded={isExpanded}
    onClick={(event) => {
      event.stopPropagation();
      onToggle();
    }}
  >
    {isExpanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
    {label}
  </button>
);

const OUTCOME_ENTRY_CLASSES: Record<RequestOutcome, string | undefined> = {
  succeeded: undefined,
  failed: styles.entryFailed,
  pending: styles.entryPending,
};

const NetworkTab: React.FC<{ entries: NetworkEntry[]; timeline: Timeline }> = ({ entries, timeline }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  if (entries.length === 0) {
    return <p className={styles.empty}>No requests</p>;
  }
  return (
    <div>
      {entries.map((entry, index) => {
        const outcome = requestOutcomeOf(entry);
        const isExpanded = expandedIndex === index;
        return (
          <TimedEntry key={index} time={entry.t_start} timeline={timeline} stateClass={OUTCOME_ENTRY_CLASSES[outcome]}>
            <div className={styles.entryLine}>
              <EntryTime time={entry.t_start} timeline={timeline} />
              <span className={styles.method}>{entry.method}</span>
              <span className={`${styles.httpStatus} ${styles[outcome]}`}>
                {entry.pending ? 'PENDING' : entry.status === null ? 'ERROR' : entry.status}
              </span>
              <span className={styles.url} title={entry.url}>{entry.url}</span>
              <span className={styles.entryEnd}>
                {describeRequestDuration(entry)}
                <ExpandButton isExpanded={isExpanded} label="Details" onToggle={() => setExpandedIndex(isExpanded ? null : index)} />
              </span>
            </div>
            {isExpanded && <RequestDetails entry={entry} outcome={outcome} />}
          </TimedEntry>
        );
      })}
    </div>
  );
};

function hasEntries(headers: Record<string, string> | undefined): headers is Record<string, string> {
  return headers !== undefined && Object.keys(headers).length > 0;
}

// Captured values come from the reporting website, so every part is shown as text, never as markup.
const RequestDetails: React.FC<{ entry: NetworkEntry; outcome: RequestOutcome }> = ({ entry, outcome }) => (
  <div className={styles.entryDetails} onClick={(event) => event.stopPropagation()}>
    <CodeBlock title="request" content={`${entry.method} ${entry.url}`} />
    {entry.error && <CodeBlock title="error" content={entry.error} />}
    {outcome === 'pending' && <p className={styles.notice}>No response yet when the report was sent.</p>}
    {hasEntries(entry.request?.headers) && (
      <CodeBlock title="request headers" content={JSON.stringify(entry.request.headers, null, 2)} />
    )}
    {entry.request?.body && (
      <CodeBlock title={`request body${entry.request.body_truncated ? ' (truncated)' : ''}`} content={entry.request.body} />
    )}
    {hasEntries(entry.response?.headers) && (
      <CodeBlock title="response headers" content={JSON.stringify(entry.response.headers, null, 2)} />
    )}
    {entry.response && (
      <CodeBlock title={`response body${entry.response.body_truncated ? ' (truncated)' : ''}`} content={entry.response.body || '[empty]'} />
    )}
  </div>
);

const CONSOLE_FILTERS: { id: ConsoleFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'error', label: 'Errors' },
  { id: 'warn', label: 'Warnings' },
];

const ConsoleTab: React.FC<{ entries: ConsoleEntry[]; timeline: Timeline }> = ({ entries, timeline }) => {
  const [filter, setFilter] = useState<ConsoleFilter>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  // Entries keep their place in the whole list, so an expanded stack trace stays with its entry across filters.
  const visibleEntries = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => filter === 'all' || entry.level === filter);
  const countOf = (id: ConsoleFilter) => (id === 'all' ? entries.length : entries.filter((entry) => entry.level === id).length);

  return (
    <div>
      <div className={styles.filterBar} role="group" aria-label="Level">
        {CONSOLE_FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            className={`${ui.button} ${ui.buttonSmall} ${filter === option.id ? styles.filterButtonActive : ''}`}
            onClick={() => setFilter(option.id)}
          >
            {option.label} {countOf(option.id)}
          </button>
        ))}
      </div>
      {visibleEntries.length === 0 && <p className={styles.empty}>No entries</p>}
      {visibleEntries.map(({ entry, index }) => {
        const isExpanded = expandedIndex === index;
        const levelClass = entry.level === 'error' ? styles.levelError : entry.level === 'warn' ? styles.levelWarn : styles.level;
        return (
          <TimedEntry key={index} time={entry.t} timeline={timeline} stateClass={entry.level === 'error' ? styles.entryFailed : undefined}>
            <div className={styles.entryLine}>
              <EntryTime time={entry.t} timeline={timeline} />
              <span className={levelClass}>{entry.level}</span>
              {/* React renders the message as text, so markup in it never runs. */}
              <span className={styles.consoleMessage}>{entry.message}</span>
              {entry.stack && (
                <span className={styles.entryEnd}>
                  <ExpandButton isExpanded={isExpanded} label="Stack" onToggle={() => setExpandedIndex(isExpanded ? null : index)} />
                </span>
              )}
            </div>
            {isExpanded && entry.stack && (
              <div className={styles.entryDetails} onClick={(event) => event.stopPropagation()}>
                <CodeBlock title="stack trace" content={entry.stack} />
              </div>
            )}
          </TimedEntry>
        );
      })}
    </div>
  );
};

const BREADCRUMB_LABELS: Record<string, string> = { click: 'click', navigation: 'navigation', focus: 'focus' };

const ActionsTab: React.FC<{ report: ReportView; timeline: Timeline }> = ({ report, timeline }) => {
  if (report.breadcrumbs.length === 0) {
    return <p className={styles.empty}>No actions</p>;
  }
  return (
    <div>
      {report.breadcrumbs.map((breadcrumb, index) => (
        <TimedEntry key={index} time={breadcrumb.t} timeline={timeline}>
          <div className={styles.entryLine}>
            <EntryTime time={breadcrumb.t} timeline={timeline} />
            <span className={styles.breadcrumbKind}>{BREADCRUMB_LABELS[breadcrumb.kind] ?? breadcrumb.kind}</span>
            <span className={styles.consoleMessage}>
              {breadcrumb.target || breadcrumb.url}
              {breadcrumb.text && <span className={ui.muted}> «{breadcrumb.text}»</span>}
            </span>
          </div>
        </TimedEntry>
      ))}
    </div>
  );
};
