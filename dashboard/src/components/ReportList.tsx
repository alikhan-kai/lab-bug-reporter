import { CircleX, Image, Unplug, Video } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { ReportFilters, ReportStatus, ReportSummary, ReportType } from '../api/types';
import { useCurrentUser } from '../auth/AuthProvider';
import type { ReportListState } from '../hooks/useReportList';
import { reportHref } from '../hooks/useReportRoute';
import styles from './ReportList.module.css';
import { Bone } from './Skeleton';
import { STATUS_LABELS, StatusBadge, TYPE_LABELS, TypeBadge } from './StatusBadge';
import ui from './ui.module.css';

const SEARCH_DELAY_MS = 300;
const SKELETON_ROWS = 6;
const COLUMN_COUNT = 5;

const STATUS_OPTIONS: ReportStatus[] = ['new', 'in_progress', 'resolved', 'wont_fix'];
const TYPE_OPTIONS: ReportType[] = ['bug', 'feature', 'question'];

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

interface ReportListProps {
  state: ReportListState;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSelectReport: (reportId: string) => void;
}

/** The list of reports in the campus.codes Problems layout: the table, and the filters in a card beside it. */
export const ReportList: React.FC<ReportListProps> = ({ state, filters, onFiltersChange, onPageChange, onRetry, onSelectReport }) => {
  const totalElements = state.status === 'ready' ? state.page.totalElements : null;

  return (
    <div className={ui.page}>
      <div className={styles.heading}>
        <h1 className={ui.pageTitle}>Reports</h1>
        {totalElements !== null && <span className={styles.count}>{totalElements}</span>}
      </div>

      <div className={styles.layout}>
        <div>
          <div className={`${ui.card} ${styles.tableCard}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.typeCell}><span className={ui.visuallyHidden}>Type</span></th>
                  <th>Title</th>
                  <th className={styles.sideCell}>Status</th>
                  <th className={`${styles.sideCell} ${styles.reporterCell}`}>Reporter</th>
                  <th className={styles.sideCell}>Created</th>
                </tr>
              </thead>
              <tbody>
                {state.status === 'loading' && <SkeletonRows />}
                {state.status === 'error' && (
                  <tr>
                    <td colSpan={COLUMN_COUNT} role="alert" className={ui.errorMessage}>
                      <p className={styles.errorText}>{state.message}</p>
                      <button type="button" className={ui.button} onClick={onRetry}>Try again</button>
                    </td>
                  </tr>
                )}
                {state.status === 'ready' && state.page.content.length === 0 && (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className={ui.message}>No reports match these filters</td>
                  </tr>
                )}
                {state.status === 'ready' && state.page.content.map((report) => (
                  <ReportRow key={report.id} report={report} onSelect={() => onSelectReport(report.id)} />
                ))}
              </tbody>
            </table>
          </div>

          {state.status === 'ready' && state.page.totalPages > 1 && (
            <nav aria-label="Pages" className={styles.pager}>
              <button type="button" className={ui.button} disabled={state.page.page === 0} onClick={() => onPageChange(state.page.page - 1)}>
                Previous
              </button>
              <span>Page {state.page.page + 1} of {state.page.totalPages}</span>
              <button
                type="button"
                className={ui.button}
                disabled={state.page.page + 1 >= state.page.totalPages}
                onClick={() => onPageChange(state.page.page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </div>

        <ReportFiltersCard filters={filters} onFiltersChange={onFiltersChange} />
      </div>
    </div>
  );
};

const ReportRow: React.FC<{ report: ReportSummary; onSelect: () => void }> = ({ report, onSelect }) => (
  // The title link is the keyboard way in; a click anywhere on the row opens the report too.
  <tr className={styles.row} onClick={onSelect}>
    <td className={styles.typeCell}><TypeBadge type={report.type} iconOnly /></td>
    <td className={styles.titleCell}>
      <div className={styles.titleLine}>
        {/* A real link, so the report opens in a new tab or its address can be copied. */}
        <a
          href={reportHref(report.id)}
          className={`${ui.link} ${styles.title}`}
          onClick={(e) => {
            e.stopPropagation();
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            onSelect();
          }}
        >
          {report.title}
        </a>
        <ReportSignals report={report} />
      </div>
      <div className={styles.subLine}>{report.projectName} · {report.pageUrl}</div>
    </td>
    <td className={styles.sideCell}><StatusBadge status={report.status} /></td>
    <td className={`${styles.sideCell} ${styles.reporterCell}`}>{report.reporter.email ?? report.reporter.id ?? '—'}</td>
    <td className={`${styles.sideCell} ${styles.date}`}>
      <time dateTime={report.createdAt}>{dateFormat.format(new Date(report.createdAt))}</time>
    </td>
  </tr>
);

/** What came with the report and what went wrong on the page, as small icons with counts. */
const ReportSignals: React.FC<{ report: ReportSummary }> = ({ report }) => (
  <span className={styles.signals}>
    {report.hasVideo && (
      <span className={styles.signal} title="Screen recording">
        <Video size={14} aria-hidden="true" />
        <span className={ui.visuallyHidden}>Video</span>
      </span>
    )}
    {report.screenshotCount > 0 && (
      <span className={styles.signal} title={`Screenshots: ${report.screenshotCount}`}>
        <Image size={14} aria-hidden="true" />
        {report.screenshotCount}
        <span className={ui.visuallyHidden}>screenshots</span>
      </span>
    )}
    {report.consoleErrorCount > 0 && (
      <span className={styles.signalDanger} title={`Console errors: ${report.consoleErrorCount}`}>
        <CircleX size={14} aria-hidden="true" />
        {report.consoleErrorCount}
        <span className={ui.visuallyHidden}>console errors</span>
      </span>
    )}
    {report.failedRequestCount > 0 && (
      <span className={styles.signalWarning} title={`Failed requests (4xx, 5xx or network error): ${report.failedRequestCount}`}>
        <Unplug size={14} aria-hidden="true" />
        {report.failedRequestCount}
        <span className={ui.visuallyHidden}>failed requests</span>
      </span>
    )}
  </span>
);

const SkeletonRows: React.FC = () => (
  <>
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <tr key={index} aria-hidden="true" className={styles.row}>
        <td className={styles.typeCell}><Bone width={16} height={16} /></td>
        <td className={styles.titleCell}>
          <Bone width="60%" height={14} />
          <span className={styles.skeletonSubLine}><Bone width="35%" height={10} /></span>
        </td>
        <td className={styles.sideCell}><Bone width={72} height={22} radius={11} /></td>
        <td className={`${styles.sideCell} ${styles.reporterCell}`}><Bone width={120} height={14} /></td>
        <td className={styles.sideCell}><Bone width={90} height={14} /></td>
      </tr>
    ))}
  </>
);

interface ReportFiltersCardProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
}

/** Search, project, status and type, in the sectioned card campus.codes uses for its filters. */
const ReportFiltersCard: React.FC<ReportFiltersCardProps> = ({ filters, onFiltersChange }) => {
  const user = useCurrentUser();
  const [searchText, setSearchText] = useState(filters.query);

  // The search goes to the server, so it waits until the user stops typing.
  useEffect(() => {
    if (searchText === filters.query) return;
    const timer = window.setTimeout(() => onFiltersChange({ ...filters, query: searchText }), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [searchText, filters, onFiltersChange]);

  return (
    <aside className={`${ui.card} ${styles.filters}`} aria-label="Filters">
      <div className={styles.filterSection}>
        <label htmlFor="report-search" className={`${ui.sectionLabel} ${styles.blockLabel}`}>Search</label>
        <input
          id="report-search"
          type="search"
          className={`${ui.input} ${styles.searchInput}`}
          placeholder="Search reports…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {user.projects.length > 1 && (
        <FilterOptions
          legend="Project"
          options={user.projects.map((project) => ({ value: project.slug, label: project.name }))}
          selected={filters.projects}
          onChange={(projects) => onFiltersChange({ ...filters, projects })}
        />
      )}

      <FilterOptions
        legend="Status"
        options={STATUS_OPTIONS.map((status) => ({ value: status, label: STATUS_LABELS[status] }))}
        selected={filters.statuses}
        onChange={(statuses) => onFiltersChange({ ...filters, statuses })}
      />

      <FilterOptions
        legend="Type"
        options={TYPE_OPTIONS.map((type) => ({ value: type, label: TYPE_LABELS[type] }))}
        selected={filters.types}
        onChange={(types) => onFiltersChange({ ...filters, types })}
      />
    </aside>
  );
};

interface FilterOptionsProps<T extends string> {
  legend: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
}

// Checkboxes like campus.codes: a report matches any ticked value, and nothing ticked shows everything.
function FilterOptions<T extends string>({ legend, options, selected, onChange }: FilterOptionsProps<T>) {
  const toggle = (value: T) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };
  return (
    <fieldset className={styles.filterSection}>
      <legend className={ui.sectionLabel}>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={styles.option}>
          <input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)} />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
