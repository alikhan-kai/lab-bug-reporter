import React, { useState } from 'react';
import { ReportItem, ReportStatus, ReportType } from '../types';

interface ReportListProps {
  reports: ReportItem[];
  onSelectReport: (report: ReportItem) => void;
  selectedProject: string;
}

export const ReportList: React.FC<ReportListProps> = ({ reports, onSelectReport, selectedProject }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredReports = reports.filter(r => {
    if (selectedProject !== 'all' && r.projectSlug !== selectedProject) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchEmail = r.reporter.email.toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchEmail && !matchId) return false;
    }
    return true;
  });

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'new':
        return (
          <span style={{
            background: 'rgba(56, 189, 248, 0.1)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}>
            Новый
          </span>
        );
      case 'in_progress':
        return (
          <span style={{
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}>
            В работе
          </span>
        );
      case 'resolved':
        return (
          <span style={{
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}>
            Решено
          </span>
        );
      case 'wont_fix':
        return (
          <span style={{
            background: 'rgba(100, 116, 139, 0.1)',
            color: '#94a3b8',
            border: '1px solid rgba(100, 116, 139, 0.25)',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}>
            Отклонено
          </span>
        );
    }
  };

  const getTypeBadge = (type: ReportType) => {
    switch (type) {
      case 'bug':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f87171', fontSize: '11px', fontWeight: 600 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/>
            </svg>
            Баг
          </span>
        );
      case 'feature':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontSize: '11px', fontWeight: 600 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v8M4.93 4.93l5.66 5.66M2 12h8M4.93 19.07l5.66-5.66M12 22v-8M19.07 19.07l-5.66-5.66M22 12h-8M19.07 4.93l-5.66 5.66"/>
            </svg>
            Предложение
          </span>
        );
      case 'question':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#c084fc', fontSize: '11px', fontWeight: 600 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Вопрос
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '32px 28px', maxWidth: '1360px', margin: '0 auto' }}>
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
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
            Всего обращений в проекте: <strong style={{ color: '#cbd5e1' }}>{filteredReports.length}</strong>
          </p>
        </div>

        {/* Фильтры и поиск */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Поиск по теме, автору..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                padding: '7px 12px 7px 32px',
                borderRadius: '6px',
                fontSize: '12px',
                width: '240px',
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
              style={{ position: 'absolute', left: '10px', top: '9px' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: '#090d16',
              border: '1px solid #1e293b',
              color: '#cbd5e1',
              padding: '7px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">Все статусы</option>
            <option value="new">Только новые</option>
            <option value="in_progress">В работе</option>
            <option value="resolved">Решенные</option>
            <option value="wont_fix">Отклоненные</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              background: '#090d16',
              border: '1px solid #1e293b',
              color: '#cbd5e1',
              padding: '7px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">Все типы</option>
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
        overflow: 'hidden',
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
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                  Отчетов по выбранным фильтрам не найдено
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => {
                const errorCount = report.console.filter(c => c.level === 'error').length;
                const networkFailedCount = report.network.filter(n => n.status === null || n.status >= 400).length;

                return (
                  <tr
                    key={report.id}
                    onClick={() => onSelectReport(report)}
                    style={{
                      borderBottom: '1px solid #1e293b',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#0f172a')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8', fontSize: '12px' }}>
                        {report.id}
                      </span>
                      <div style={{ marginTop: '3px' }}>{getTypeBadge(report.type)}</div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '3px', letterSpacing: '-0.1px' }}>
                        {report.title}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                        {report.pageUrl}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {report.projectName}
                    </td>

                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {report.videoUrl && (
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
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Видео
                          </span>
                        )}

                        {report.screenshotUrl && (
                          <span title="Скриншот" style={{
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
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            </svg>
                            Снимок
                          </span>
                        )}

                        {errorCount > 0 && (
                          <span title="Ошибок в консоли" style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>
                            ✕ {errorCount}
                          </span>
                        )}

                        {networkFailedCount > 0 && (
                          <span title="Сбоев HTTP (4xx / 5xx)" style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>
                            500 ({networkFailedCount})
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', color: '#cbd5e1', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {report.reporter.email}
                    </td>

                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      {getStatusBadge(report.status)}
                    </td>

                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(report.createdAt).toLocaleDateString()} {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
