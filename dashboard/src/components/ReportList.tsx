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

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

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
        <h1 className={ui.pageTitle}>Отчеты</h1>
        {totalElements !== null && <span className={styles.count}>{totalElements}</span>}
      </div>

      <div className={styles.layout}>
        <div>
          <div className={`${ui.card} ${styles.tableCard}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.typeCell}><span className={ui.visuallyHidden}>Тип</span></th>
                  <th>Отчет</th>
                  <th className={styles.sideCell}>Статус</th>
                  <th className={`${styles.sideCell} ${styles.reporterCell}`}>Автор</th>
                  <th className={styles.sideCell}>Создан</th>
                </tr>
              </thead>
              <tbody>
                {state.status === 'loading' && <SkeletonRows />}
                {state.status === 'error' && (
                  <tr>
                    <td colSpan={COLUMN_COUNT} role="alert" className={ui.errorMessage}>
                      <p className={styles.errorText}>{state.message}</p>
                      <button type="button" className={ui.button} onClick={onRetry}>Повторить</button>
                    </td>
                  </tr>
                )}
                {state.status === 'ready' && state.page.content.length === 0 && (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className={ui.message}>Отчетов с такими фильтрами нет</td>
                  </tr>
                )}
                {state.status === 'ready' && state.page.content.map((report) => (
                  <ReportRow key={report.id} report={report} onSelect={() => onSelectReport(report.id)} />
                ))}
              </tbody>
            </table>
          </div>

          {state.status === 'ready' && state.page.totalPages > 1 && (
            <nav aria-label="Страницы" className={styles.pager}>
              <button type="button" className={ui.button} disabled={state.page.page === 0} onClick={() => onPageChange(state.page.page - 1)}>
                Назад
              </button>
              <span>Страница {state.page.page + 1} из {state.page.totalPages}</span>
              <button
                type="button"
                className={ui.button}
                disabled={state.page.page + 1 >= state.page.totalPages}
                onClick={() => onPageChange(state.page.page + 1)}
              >
                Вперед
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
      <span className={styles.signal} title="Есть запись экрана">
        <Video size={14} aria-hidden="true" />
        <span className={ui.visuallyHidden}>Видео</span>
      </span>
    )}
    {report.screenshotCount > 0 && (
      <span className={styles.signal} title={`Скриншотов: ${report.screenshotCount}`}>
        <Image size={14} aria-hidden="true" />
        {report.screenshotCount}
        <span className={ui.visuallyHidden}>скриншотов</span>
      </span>
    )}
    {report.consoleErrorCount > 0 && (
      <span className={styles.signalDanger} title={`Ошибок в консоли: ${report.consoleErrorCount}`}>
        <CircleX size={14} aria-hidden="true" />
        {report.consoleErrorCount}
        <span className={ui.visuallyHidden}>ошибок в консоли</span>
      </span>
    )}
    {report.failedRequestCount > 0 && (
      <span className={styles.signalWarning} title={`Упавших запросов (4xx, 5xx или ошибка сети): ${report.failedRequestCount}`}>
        <Unplug size={14} aria-hidden="true" />
        {report.failedRequestCount}
        <span className={ui.visuallyHidden}>упавших запросов</span>
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
    <aside className={`${ui.card} ${styles.filters}`} aria-label="Фильтры">
      <div className={styles.filterSection}>
        <label htmlFor="report-search" className={`${ui.sectionLabel} ${styles.blockLabel}`}>Поиск</label>
        <input
          id="report-search"
          type="search"
          className={`${ui.input} ${styles.searchInput}`}
          placeholder="Найти отчет…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {user.projects.length > 1 && (
        <FilterOptions
          legend="Проект"
          name="project"
          options={user.projects.map((project) => ({ value: project.slug, label: project.name }))}
          value={filters.project}
          onChange={(project) => onFiltersChange({ ...filters, project })}
        />
      )}

      <FilterOptions
        legend="Статус"
        name="status"
        options={STATUS_OPTIONS.map((status) => ({ value: status, label: STATUS_LABELS[status] }))}
        value={filters.status}
        onChange={(status) => onFiltersChange({ ...filters, status })}
      />

      <FilterOptions
        legend="Тип"
        name="type"
        options={TYPE_OPTIONS.map((type) => ({ value: type, label: TYPE_LABELS[type] }))}
        value={filters.type}
        onChange={(type) => onFiltersChange({ ...filters, type })}
      />
    </aside>
  );
};

interface FilterOptionsProps<T extends string> {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
}

// One value at a time, as the API filters by one; "Все" clears the filter.
function FilterOptions<T extends string>({ legend, name, options, value, onChange }: FilterOptionsProps<T>) {
  return (
    <fieldset className={styles.filterSection}>
      <legend className={ui.sectionLabel}>{legend}</legend>
      <label className={styles.option}>
        <input type="radio" name={name} checked={value === null} onChange={() => onChange(null)} />
        Все
      </label>
      {options.map((option) => (
        <label key={option.value} className={styles.option}>
          <input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
