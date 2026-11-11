import React, { useEffect, useState } from 'react';
import type { ReportFilters, ReportStatus, ReportSummary, ReportType } from '../api/types';
import type { ReportListState } from '../hooks/useReportList';
import { reportHref } from '../hooks/useReportRoute';
import { Bone, SkeletonStyles } from './Skeleton';
import { StatusBadge } from './StatusBadge';

const SEARCH_DELAY_MS = 300;
const SKELETON_ROWS = 6;
const COLUMN_COUNT = 7;

interface ReportListProps {
  state: ReportListState;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSelectReport: (reportId: string) => void;
}

const selectStyle: React.CSSProperties = {
  background: '#090d16',
  border: '1px solid #1e293b',
  color: '#cbd5e1',
  padding: '7px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  outline: 'none',
  cursor: 'pointer'
};

const pagerButtonStyle: React.CSSProperties = {
  background: '#090d16',
  border: '1px solid #1e293b',
  color: '#cbd5e1',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  cursor: 'pointer'
};

const cellStyle: React.CSSProperties = { padding: '14px 18px' };

export const ReportList: React.FC<ReportListProps> = ({
  state,
  filters,
  onFiltersChange,
  onPageChange,
  onRetry,
  onSelectReport
}) => {
  const [searchText, setSearchText] = useState(filters.query);

  // The search goes to the server, so it waits until the user stops typing.
  useEffect(() => {
    if (searchText === filters.query) return;
    const timer = window.setTimeout(() => onFiltersChange({ ...filters, query: searchText }), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [searchText, filters, onFiltersChange]);

  const totalElements = state.status === 'ready' ? state.page.totalElements : null;

  return (
    <div style={{ padding: '32px 16px', maxWidth: '1360px', margin: '0 auto' }}>
      <SkeletonStyles />
      {/* Шапка списка */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.3px' }}>
            Входящие отчеты
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px', minHeight: '18px' }}>
            {totalElements !== null && (
              <>Найдено отчетов: <strong style={{ color: '#cbd5e1' }}>{totalElements}</strong></>
            )}
          </p>
        </div>

        {/* Фильтры и поиск */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="search"
              aria-label="Поиск по названию и описанию"
              placeholder="Поиск по названию и описанию..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                padding: '7px 12px 7px 32px',
                borderRadius: '6px',
                fontSize: '12px',
                width: '240px',
                maxWidth: '100%',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              aria-hidden="true"
              style={{ position: 'absolute', left: '10px', top: '9px' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          <select
            aria-label="Статус"
            value={filters.status ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, status: (e.target.value || null) as ReportStatus | null })}
            style={selectStyle}
          >
            <option value="">Все статусы</option>
            <option value="new">Только новые</option>
            <option value="in_progress">В работе</option>
            <option value="resolved">Решенные</option>
            <option value="wont_fix">Отклоненные</option>
          </select>

          <select
            aria-label="Тип"
            value={filters.type ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, type: (e.target.value || null) as ReportType | null })}
            style={selectStyle}
          >
            <option value="">Все типы</option>
            <option value="bug">Только баги</option>
            <option value="feature">Предложения</option>
            <option value="question">Вопросы</option>
          </select>
        </div>
      </div>

      {/* Таблица отчетов campus.codes style */}
      <div style={{
        background: '#0b1120',
        borderRadius: '10px',
        border: '1px solid #1e293b',
        overflowX: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#090d16', color: '#64748b', borderBottom: '1px solid #1e293b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              <th style={{ padding: '12px 18px', fontWeight: 600 }}>ID / Тип</th>
              <th style={{ padding: '12px 18px', fontWeight: 600 }}>Тема отчета</th>
              <th style={{ padding: '12px 18px', fontWeight: 600 }}>Проект</th>
              <th style={{ padding: '12px 18px', fontWeight: 600 }}>Вложения и сбои</th>
              <th style={{ padding: '12px 18px', fontWeight: 600 }}>Автор</th>
              <th style={{ padding: '12px 18px', fontWeight: 600 }}>Статус</th>
              <th style={{ padding: '12px 18px', fontWeight: 600 }}>Дата</th>
            </tr>
          </thead>
          <tbody>
            {state.status === 'loading' && <SkeletonRows />}

            {state.status === 'error' && (
              <tr>
                <td colSpan={COLUMN_COUNT} role="alert" style={{ padding: '48px', textAlign: 'center', color: '#f87171' }}>
                  <div style={{ marginBottom: '12px' }}>{state.message}</div>
                  <button type="button" onClick={onRetry} style={pagerButtonStyle}>Повторить</button>
                </td>
              </tr>
            )}

            {state.status === 'ready' && state.page.content.length === 0 && (
              <tr>
                <td colSpan={COLUMN_COUNT} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                  Отчетов по выбранным фильтрам не найдено
                </td>
              </tr>
            )}

            {state.status === 'ready' && state.page.content.map((report) => (
              <ReportRow key={report.id} report={report} onSelect={() => onSelectReport(report.id)} />
            ))}
          </tbody>
        </table>
      </div>

      {state.status === 'ready' && state.page.totalPages > 1 && (
        <nav aria-label="Страницы" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '16px', color: '#64748b', fontSize: '12px' }}>
          <button
            type="button"
            style={pagerButtonStyle}
            disabled={state.page.page === 0}
            onClick={() => onPageChange(state.page.page - 1)}
          >
            Назад
          </button>
          <span>Страница {state.page.page + 1} из {state.page.totalPages}</span>
          <button
            type="button"
            style={pagerButtonStyle}
            disabled={state.page.page + 1 >= state.page.totalPages}
            onClick={() => onPageChange(state.page.page + 1)}
          >
            Вперед
          </button>
        </nav>
      )}
    </div>
  );
};

const SkeletonRows: React.FC = () => (
  <>
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <tr key={index} aria-hidden="true" style={{ borderBottom: '1px solid #1e293b' }}>
        <td style={cellStyle}><Bone width={70} height={14} /></td>
        <td style={cellStyle}><Bone width="80%" height={14} /></td>
        <td style={cellStyle}><Bone width={90} height={14} /></td>
        <td style={cellStyle}><Bone width={110} height={14} /></td>
        <td style={cellStyle}><Bone width={120} height={14} /></td>
        <td style={cellStyle}><Bone width={70} height={18} radius={9} /></td>
        <td style={cellStyle}><Bone width={100} height={14} /></td>
      </tr>
    ))}
  </>
);

const ReportRow: React.FC<{ report: ReportSummary; onSelect: () => void }> = ({ report, onSelect }) => (
  // The title link is the keyboard way in; a click anywhere on the row opens the report too.
  <tr
    onClick={onSelect}
    style={{
      borderBottom: '1px solid #1e293b',
      cursor: 'pointer',
      transition: 'background 0.15s ease'
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = '#0f172a')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
      <span title={report.id} style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8', fontSize: '12px' }}>
        {shortId(report.id)}
      </span>
      <div style={{ marginTop: '3px' }}><TypeBadge type={report.type} /></div>
    </td>

    <td style={cellStyle}>
      {/* A real link, so the report opens in a new tab or its address can be copied. */}
      <a
        href={reportHref(report.id)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          onSelect();
        }}
        style={{ display: 'block', fontWeight: 600, color: '#f1f5f9', marginBottom: '3px', letterSpacing: '-0.1px', textDecoration: 'none' }}
      >
        {report.title}
      </a>
      <div style={{ color: '#64748b', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
        {report.pageUrl}
      </div>
    </td>

    <td style={{ ...cellStyle, color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '12px' }}>
      {report.projectName}
    </td>

    <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {report.hasVideo && (
          <span title="Видеозапись экрана" style={{
            background: 'rgba(2, 132, 199, 0.15)',
            color: '#38bdf8',
            border: '1px solid rgba(2, 132, 199, 0.3)',
            padding: '2px 7px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Видео
          </span>
        )}

        {report.screenshotCount > 0 && (
          <span title="Скриншоты" style={{
            background: '#1e293b',
            color: '#cbd5e1',
            border: '1px solid #334155',
            padding: '2px 7px',
            borderRadius: '4px',
            fontSize: '11px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
            </svg>
            {report.screenshotCount > 1 ? `Снимки: ${report.screenshotCount}` : 'Снимок'}
          </span>
        )}

        {report.consoleErrorCount > 0 && (
          <span title="Ошибок в консоли" style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700
          }}>
            ✕ {report.consoleErrorCount}
          </span>
        )}

        {report.failedRequestCount > 0 && (
          <span title="Упавших запросов (4xx, 5xx или ошибка сети)" style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700
          }}>
            HTTP ✕ {report.failedRequestCount}
          </span>
        )}
      </div>
    </td>

    <td style={{ ...cellStyle, color: '#cbd5e1', whiteSpace: 'nowrap', fontSize: '12px' }}>
      {report.reporter.email ?? report.reporter.id ?? '—'}
    </td>

    <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
      <StatusBadge status={report.status} />
    </td>

    <td style={{ ...cellStyle, color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
      {new Date(report.createdAt).toLocaleDateString()} {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </td>
  </tr>
);

// The full id is in the tooltip and the detail view; eight characters are enough to tell reports apart.
function shortId(reportId: string): string {
  return reportId.slice(0, 8);
}

const TypeBadge: React.FC<{ type: ReportType }> = ({ type }) => {
  switch (type) {
    case 'bug':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f87171', fontSize: '11px', fontWeight: 600 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/>
          </svg>
          Баг
        </span>
      );
    case 'feature':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontSize: '11px', fontWeight: 600 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2v8M4.93 4.93l5.66 5.66M2 12h8M4.93 19.07l5.66-5.66M12 22v-8M19.07 19.07l-5.66-5.66M22 12h-8M19.07 4.93l-5.66 5.66"/>
          </svg>
          Предложение
        </span>
      );
    case 'question':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#c084fc', fontSize: '11px', fontWeight: 600 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          Вопрос
        </span>
      );
  }
};
