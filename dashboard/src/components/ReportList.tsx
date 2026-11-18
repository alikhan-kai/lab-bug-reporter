import { ArrowLeft, ArrowRight, Image, Search, SquareTerminal, Unplug, Video } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { REPORT_PAGE_SIZE } from '../api/client';
import type { ReportFilters, ReportStatus, ReportStatusCounts, ReportSummary, ReportType } from '../api/types';
import { useCurrentUser } from '../auth/AuthProvider';
import type { ReportListState } from '../hooks/useReportList';
import { reportHref } from '../hooks/useReportRoute';
import { groupReports, type ReportGroup } from '../report/groups';
import styles from './ReportList.module.css';
import { Bone } from './Skeleton';
import { STATUS_LABELS, StatusGlyph, TYPE_LABELS } from './StatusBadge';
import ui from './ui.module.css';

const SEARCH_DELAY_MS = 300;
const SKELETON_ROWS = 6;
const ICON_SIZE = 14;

const STATUS_OPTIONS: ReportStatus[] = ['new', 'in_progress', 'resolved', 'wont_fix'];
const TYPE_OPTIONS: ReportType[] = ['bug', 'feature', 'question'];
const TYPE_FILTER_LABELS: Record<ReportType, string> = { bug: 'bugs', feature: 'feature requests', question: 'questions' };

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

interface ReportListProps {
  state: ReportListState;
  counts: ReportStatusCounts | null;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSelectReport: (reportId: string) => void;
}

/** The reports as a quiet log: status counts that filter, a one-line filter sentence, then the reports by day. */
export const ReportList: React.FC<ReportListProps> = ({ state, counts, filters, onFiltersChange, onPageChange, onRetry, onSelectReport }) => (
  <div className={ui.page}>
    <div className={styles.heading}>
      <h1 className={ui.pageTitle}>Reports</h1>
      <span className={styles.tagline}>what people ran into on the lab's sites</span>
    </div>

    <StatusSwitch counts={counts} selected={filters.statuses} onChange={(statuses) => onFiltersChange({ ...filters, statuses })} />
    <FilterSentence filters={filters} onFiltersChange={onFiltersChange} />

    {state.status === 'loading' && <SkeletonGroup />}
    {state.status === 'error' && (
      <div role="alert" className={ui.errorMessage}>
        <p className={styles.errorText}>{state.message}</p>
        <button type="button" className={ui.button} onClick={onRetry}>Try again</button>
      </div>
    )}
    {state.status === 'ready' && state.page.content.length === 0 && (
      <p className={ui.message}>No reports match these filters</p>
    )}
    {state.status === 'ready' && groupReports(state.page.content).map((group) => (
      <ReportDay key={group.key} group={group} onSelectReport={onSelectReport} />
    ))}

    {state.status === 'ready' && state.page.totalElements > 0 && (
      <Pager page={state.page.page} totalPages={state.page.totalPages} totalElements={state.page.totalElements} onPageChange={onPageChange} />
    )}
  </div>
);

interface StatusSwitchProps {
  counts: ReportStatusCounts | null;
  selected: ReportStatus[];
  onChange: (statuses: ReportStatus[]) => void;
}

// A status toggles in and out, so several can be shown at once; All clears them.
const StatusSwitch: React.FC<StatusSwitchProps> = ({ counts, selected, onChange }) => {
  const total = counts ? STATUS_OPTIONS.reduce((sum, status) => sum + counts[status], 0) : null;
  const toggle = (status: ReportStatus) =>
    onChange(selected.includes(status) ? selected.filter((item) => item !== status) : [...selected, status]);

  return (
    <div role="group" aria-label="Status" className={styles.statusSwitch}>
      <StatusCount label="All" count={total} isPressed={selected.length === 0} onClick={() => onChange([])}>
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 16 16" aria-hidden="true" className={styles.allGlyph}>
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      </StatusCount>
      {STATUS_OPTIONS.map((status) => (
        <StatusCount
          key={status}
          label={STATUS_LABELS[status]}
          count={counts ? counts[status] : null}
          isPressed={selected.includes(status)}
          onClick={() => toggle(status)}
        >
          <StatusGlyph status={status} isLabelled />
        </StatusCount>
      ))}
    </div>
  );
};

interface StatusCountProps {
  label: string;
  count: number | null;
  isPressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const StatusCount: React.FC<StatusCountProps> = ({ label, count, isPressed, onClick, children }) => (
  <button type="button" className={styles.statusCount} aria-pressed={isPressed} onClick={onClick}>
    {count === null
      ? <span className={styles.countNumber} aria-hidden="true"><Bone width={40} height={28} /></span>
      : <span className={styles.countNumber}>{count}</span>}
    <span className={styles.countLabel}>
      {children}
      {label}
    </span>
  </button>
);

interface FilterSentenceProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
}

/** Type, project and search as one sentence, with the choices inline. */
const FilterSentence: React.FC<FilterSentenceProps> = ({ filters, onFiltersChange }) => {
  const user = useCurrentUser();
  const [searchText, setSearchText] = useState(filters.query);
  const searchRef = useRef<HTMLInputElement>(null);

  // The search goes to the server, so it waits until the user stops typing.
  useEffect(() => {
    if (searchText === filters.query) return;
    const timer = window.setTimeout(() => onFiltersChange({ ...filters, query: searchText }), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [searchText, filters, onFiltersChange]);

  // "/" jumps to the search, unless the user is already typing somewhere.
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.closest('input, textarea, select, [contenteditable="true"]');
      if (event.key !== '/' || isTyping || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const order = filters.statuses.length === 1 ? 'newest first' : 'by status, then newest';

  return (
    <div className={styles.filterBar}>
      <p className={styles.sentence}>
        Showing
        <label htmlFor="filter-type" className={ui.visuallyHidden}>Type</label>
        <select
          id="filter-type"
          className={styles.inlineSelect}
          value={filters.types[0] ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, types: event.target.value ? [event.target.value as ReportType] : [] })}
        >
          <option value="">every type</option>
          {TYPE_OPTIONS.map((type) => <option key={type} value={type}>{TYPE_FILTER_LABELS[type]}</option>)}
        </select>
        {user.projects.length > 1 && (
          <>
            from
            <label htmlFor="filter-project" className={ui.visuallyHidden}>Project</label>
            <select
              id="filter-project"
              className={styles.inlineSelect}
              value={filters.projects[0] ?? ''}
              onChange={(event) => onFiltersChange({ ...filters, projects: event.target.value ? [event.target.value] : [] })}
            >
              <option value="">all projects</option>
              {user.projects.map((project) => <option key={project.slug} value={project.slug}>{project.name}</option>)}
            </select>
          </>
        )}
        <span className={styles.order}>· {order}</span>
      </p>

      <div className={styles.search}>
        <Search size={15} strokeWidth={1.75} aria-hidden="true" className={styles.searchIcon} />
        <label htmlFor="filter-search" className={ui.visuallyHidden}>Search reports</label>
        <input
          ref={searchRef}
          id="filter-search"
          type="search"
          className={styles.searchInput}
          placeholder="Search title or description"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <kbd className={styles.shortcut} aria-hidden="true">/</kbd>
      </div>
    </div>
  );
};

const ReportDay: React.FC<{ group: ReportGroup; onSelectReport: (reportId: string) => void }> = ({ group, onSelectReport }) => {
  const heading = [group.status ? STATUS_LABELS[group.status] : null, group.dayLabel, group.dateLabel].filter(Boolean).join(', ');
  return (
    <section aria-label={heading} className={styles.day}>
      <h2 className={styles.dayHeading}>
        {group.status && (
          <span className={styles.dayStatus}>
            <StatusGlyph status={group.status} isLabelled />
            {STATUS_LABELS[group.status]}
          </span>
        )}
        {group.dayLabel && <span className={styles.dayLabel}>{group.dayLabel}</span>}
        <span>{group.dateLabel}</span>
      </h2>
      <ul className={styles.rows}>
        {group.reports.map((report) => (
          <li key={report.id} className={styles.rowItem}>
            <ReportRow report={report} onSelect={() => onSelectReport(report.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
};

const ReportRow: React.FC<{ report: ReportSummary; onSelect: () => void }> = ({ report, onSelect }) => (
  // A real link, so the report opens in a new tab or its address can be copied; a plain click stays in the page.
  <a
    href={reportHref(report.id)}
    className={styles.row}
    onClick={(event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onSelect();
    }}
  >
    <span className={styles.statusCell}>
      <StatusGlyph status={report.status} />
    </span>
    <span className={styles.titleCell}>
      <span className={styles.title}>{report.title}</span>
      <span className={styles.subLine}>
        {TYPE_LABELS[report.type].toLowerCase()} · {report.projectName} · {pathOf(report.pageUrl)}
      </span>
    </span>
    <ReportSignals report={report} />
    <span className={styles.reporter}>{report.reporter.email ?? report.reporter.id ?? 'Not given'}</span>
    <span className={styles.time}>
      <time dateTime={report.createdAt}>{timeFormat.format(new Date(report.createdAt))}</time>
      <ArrowRight size={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" className={styles.arrow} />
    </span>
  </a>
);

// The list has room for the path only; the detail view shows the whole address.
function pathOf(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return pageUrl;
  }
}

/** What came with the report and what went wrong, in fixed slots; an empty slot is a faint dot, so columns line up. */
const ReportSignals: React.FC<{ report: ReportSummary }> = ({ report }) => {
  const signals = [
    { key: 'video', isPresent: report.hasVideo, count: null, icon: Video, tone: styles.signalPresent, label: 'Screen recording' },
    { key: 'screenshots', isPresent: report.screenshotCount > 0, count: report.screenshotCount, icon: Image, tone: styles.signalPresent, label: 'Screenshots' },
    { key: 'errors', isPresent: report.consoleErrorCount > 0, count: report.consoleErrorCount, icon: SquareTerminal, tone: styles.signalDanger, label: 'Console errors' },
    { key: 'failed', isPresent: report.failedRequestCount > 0, count: report.failedRequestCount, icon: Unplug, tone: styles.signalWarning, label: 'Failed requests' },
  ];
  return (
    <span className={styles.signals}>
      {signals.map(({ key, isPresent, count, icon: Icon, tone, label }) => (
        <span key={key} className={`${styles.signal} ${isPresent ? tone : ''}`} title={label}>
          <Icon size={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" />
          {isPresent ? (
            <>
              {count !== null && <span aria-hidden="true">{count}</span>}
              <span className={ui.visuallyHidden}>{count !== null ? `${count} ${label.toLowerCase()}` : label}</span>
            </>
          ) : (
            <span aria-hidden="true">·</span>
          )}
        </span>
      ))}
    </span>
  );
};

interface PagerProps {
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
}

const Pager: React.FC<PagerProps> = ({ page, totalPages, totalElements, onPageChange }) => {
  const first = page * REPORT_PAGE_SIZE + 1;
  const last = Math.min(totalElements, (page + 1) * REPORT_PAGE_SIZE);
  return (
    <nav aria-label="Pages" className={styles.pager}>
      <span>{first}–{last} of {totalElements}</span>
      {totalPages > 1 && (
        <div className={styles.pagerButtons}>
          <button type="button" className={styles.pageButton} aria-label="Previous page" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.pageButton}
            aria-label="Next page"
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
};

/** Rows shaped like reports, under a day heading, while the page loads. */
export const SkeletonGroup: React.FC = () => (
  <div aria-busy="true" aria-label="Loading the reports" className={styles.day}>
    <div className={styles.dayHeading}><Bone width={110} height={12} /></div>
    <ul className={styles.rows}>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} className={styles.rowItem}>
          <div className={styles.row} aria-hidden="true">
            <span className={styles.statusCell}><Bone width={14} height={14} radius={7} /></span>
            <span className={styles.titleCell}>
              <Bone width="60%" height={15} />
              <Bone width="35%" height={11} />
            </span>
            <span className={styles.signals}><Bone width={170} height={14} /></span>
            <span className={styles.reporter}><Bone width={150} height={14} /></span>
            <span className={styles.time}><Bone width={40} height={12} /></span>
          </div>
        </li>
      ))}
    </ul>
  </div>
);
