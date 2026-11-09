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
    // Проект
    if (selectedProject !== 'all' && r.projectSlug !== selectedProject) return false;
    // Статус
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    // Тип
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    // Поиск
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
        return <span style={{ background: '#0284c7', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>НОВЫЙ</span>;
      case 'in_progress':
        return <span style={{ background: '#f59e0b', color: '#1e293b', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>В РАБОТЕ</span>;
      case 'resolved':
        return <span style={{ background: '#10b981', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>РЕШЕНО</span>;
      case 'wont_fix':
        return <span style={{ background: '#475569', color: '#cbd5e1', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>ОТКЛОНЕНО</span>;
    }
  };

  const getTypeBadge = (type: ReportType) => {
    switch (type) {
      case 'bug':
        return <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '12px' }}>Баг</span>;
      case 'feature':
        return <span style={{ color: '#0284c7', fontWeight: 600, fontSize: '12px' }}>Идея</span>;
      case 'question':
        return <span style={{ color: '#a855f7', fontWeight: 600, fontSize: '12px' }}>Вопрос</span>;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Заголовок и фильтры */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 700 }}>Входящие отчеты</h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Всего отчетов в лаборатории: {filteredReports.length}</p>
        </div>

        {/* Поиск */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Поиск по теме, описанию, почте..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              width: '280px',
              outline: 'none'
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
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
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
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

      {/* Таблица отчетов */}
      <div style={{
        background: '#1e293b',
        borderRadius: '10px',
        border: '1px solid #334155',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '12px 16px' }}>ID / Тип</th>
              <th style={{ padding: '12px 16px' }}>Тема отчета</th>
              <th style={{ padding: '12px 16px' }}>Проект</th>
              <th style={{ padding: '12px 16px' }}>Вложения и сбои</th>
              <th style={{ padding: '12px 16px' }}>Пользователь</th>
              <th style={{ padding: '12px 16px' }}>Статус</th>
              <th style={{ padding: '12px 16px' }}>Дата</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Отчетов не найдено
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => {
                const errorCount = report.console.filter(c => c.level === 'error').length;
                const networkFailedCount = report.network.filter(n => n.status >= 400 || n.status === 0).length;

                return (
                  <tr
                    key={report.id}
                    onClick={() => onSelectReport(report)}
                    style={{
                      borderBottom: '1px solid #334155',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#283548')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{report.id}</span>
                      <div style={{ marginTop: '2px' }}>{getTypeBadge(report.type)}</div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '3px' }}>{report.title}</div>
                      <div style={{ color: '#94a3b8', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                        {report.pageUrl}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                      {report.projectName}
                    </td>

                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {report.videoUrl && (
                          <span title="Есть видеозапись экрана" style={{ background: '#0369a1', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                            ▶ Видео
                          </span>
                        )}
                        {report.screenshotUrl && (
                          <span title="Есть скриншот" style={{ background: '#334155', color: '#cbd5e1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                            📷 Скриншот
                          </span>
                        )}
                        {errorCount > 0 && (
                          <span title="Ошибки в консоли" style={{ background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            ✕ {errorCount}
                          </span>
                        )}
                        {networkFailedCount > 0 && (
                          <span title="Упавшие сетевые запросы" style={{ background: '#f59e0b', color: '#1e293b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            ⚡ {networkFailedCount}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                      {report.reporter.email}
                    </td>

                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      {getStatusBadge(report.status)}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '12px', whiteSpace: 'nowrap' }}>
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
