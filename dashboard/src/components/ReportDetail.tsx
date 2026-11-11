import React, { useRef, useState } from 'react';
import type { ReportStatus } from '../api/types';
import type { ReportMedia, ReportView } from '../types';
import { Bone } from './Skeleton';
import { StatusBadge } from './StatusBadge';

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

// Values come from the reporting website. Only web links become clickable, so a javascript: URL stays text.
function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function describeEnvironment(environment: Record<string, unknown> | null): { platform: string; viewport: string } {
  const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
  const viewport = environment?.viewport;
  return {
    platform: [text(environment?.browser), text(environment?.os)].filter(Boolean).join(' • ') || '—',
    viewport: Array.isArray(viewport) && viewport.length === 2 ? `${viewport[0]}x${viewport[1]}` : '—'
  };
}

export const ReportDetail: React.FC<ReportDetailProps> = ({
  report,
  media,
  canChangeStatus,
  canDelete,
  isSaving,
  actionError,
  onBack,
  onStatusChange,
  onDelete
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'network' | 'console' | 'actions' | 'environment'>('network');
  const [expandedNetworkIdx, setExpandedNetworkIdx] = useState<number | null>(null);
  const [expandedConsoleIdx, setExpandedConsoleIdx] = useState<number | null>(null);
  const [consoleFilter, setConsoleFilter] = useState<'all' | 'error' | 'warn'>('all');
  const [enlargedScreenshotUrl, setEnlargedScreenshotUrl] = useState<string | null>(null);
  const environment = describeEnvironment(report.environment);

  // Вычисление секунды относительно старта записи (Тайминг от начала видео)
  const getOffset = (t: number): number => {
    if (!report.recordingStartTime) return 0;
    return Math.max(0, (t - report.recordingStartTime) / 1000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Перемотка видео при клике на строку лога (Jam.dev синхронизация)
  const seekVideo = (offsetSeconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = offsetSeconds;
      videoRef.current.play();
    }
  };

  const filteredConsole = report.console.filter(c => {
    if (consoleFilter === 'error') return c.level === 'error';
    if (consoleFilter === 'warn') return c.level === 'warn';
    return true;
  });

  return (
    <div style={{ padding: '28px 16px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Верхняя навигация и статус */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: '#090d16',
            border: '1px solid #1e293b',
            color: '#cbd5e1',
            padding: '7px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Вернуться к списку
        </button>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {actionError && (
            <span role="alert" style={{ fontSize: '12px', color: '#f87171' }}>{actionError}</span>
          )}

          {/* Смена статуса доступна admin и triager, сервер проверяет это сам */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Статус:</span>
            {canChangeStatus ? (
              <select
                aria-label="Статус отчета"
                value={report.status}
                disabled={isSaving}
                onChange={(e) => onStatusChange(e.target.value as ReportStatus)}
                style={{
                  background: '#090d16',
                  border: '1px solid #1e293b',
                  color: '#38bdf8',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="new">Новый</option>
                <option value="in_progress">В работе</option>
                <option value="resolved">Решено</option>
                <option value="wont_fix">Отклонено</option>
              </select>
            ) : (
              <StatusBadge status={report.status} />
            )}
          </div>

          {/* Удаление доступно только admin */}
          {canDelete && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                if (confirm('Удалить отчет и все его файлы?')) {
                  onDelete();
                }
              }}
              style={{
                background: 'transparent',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                transition: 'background 0.15s'
              }}
            >
              Удалить отчет
            </button>
          )}
        </div>
      </div>

      {/* Метаданные отчета */}
      <div style={{
        background: '#0b1120',
        border: '1px solid #1e293b',
        borderRadius: '10px',
        padding: '20px 24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8', fontSize: '13px', wordBreak: 'break-all' }}>{report.id}</span>
          <span style={{ color: '#334155' }}>•</span>
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>{report.projectName}</span>
          <span style={{ color: '#334155' }}>•</span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{new Date(report.createdAt).toLocaleString()}</span>
        </div>

        {/* Защищенный вывод названия (plain text) */}
        <h1 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#f8fafc', letterSpacing: '-0.2px' }}>
          {report.title}
        </h1>
        <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {report.description || 'Без описания'}
        </p>

        {/* Компактный блок метаданных */}
        <div style={{
          background: '#090d16',
          borderRadius: '8px',
          padding: '12px 18px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          fontSize: '12px',
          border: '1px solid #1e293b'
        }}>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Пользователь</span>
            <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{report.reporter.email ?? report.reporter.id}</span>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Страница</span>
            {isWebUrl(report.pageUrl) ? (
              <a href={report.pageUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                {report.pageUrl}
              </a>
            ) : (
              <span style={{ color: '#e2e8f0', wordBreak: 'break-all' }}>{report.pageUrl}</span>
            )}
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Окружение</span>
            <span style={{ color: '#e2e8f0' }}>{environment.platform}</span>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Разрешение</span>
            <span style={{ color: '#e2e8f0' }}>{environment.viewport}</span>
          </div>
        </div>
      </div>

      {/* РАЗДЕЛЕНИЕ 50/50: Плеер слева, Синхронизированные логи справа */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '24px', alignItems: 'start' }}>
        {/* ЛЕВАЯ КОЛОНКА: ВИДЕО */}
        <div style={{
          background: '#0b1120',
          border: '1px solid #1e293b',
          borderRadius: '10px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Запись экрана
            </span>
            <span style={{
              background: '#090d16',
              border: '1px solid #1e293b',
              color: '#38bdf8',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              {formatTime(currentTime)}
            </span>
          </div>

          <MediaPanel
            media={media}
            hasVideo={report.attachments.some((attachment) => attachment.kind === 'video')}
            videoRef={videoRef}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            onEnlargeScreenshot={setEnlargedScreenshotUrl}
          />
        </div>

        {/* ПРАВАЯ КОЛОНКА: СИНХРОНИЗИРОВАННЫЕ ЛОГИ (ВРЕМЯ ОТ НАЧАЛА ЗАПИСИ) */}
        <div style={{
          background: '#0b1120',
          border: '1px solid #1e293b',
          borderRadius: '10px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '620px'
        }}>
          {/* Вкладки */}
          <div style={{
            background: '#090d16',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            padding: '0 8px'
          }}>
            <button
              onClick={() => setActiveTab('network')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'network' ? '2px solid #0284c7' : '2px solid transparent',
                color: activeTab === 'network' ? '#f8fafc' : '#64748b',
                padding: '12px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Сеть ({report.network.length})
            </button>

            <button
              onClick={() => setActiveTab('console')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'console' ? '2px solid #0284c7' : '2px solid transparent',
                color: activeTab === 'console' ? '#f8fafc' : '#64748b',
                padding: '12px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Консоль ({report.console.length})
            </button>

            <button
              onClick={() => setActiveTab('actions')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'actions' ? '2px solid #0284c7' : '2px solid transparent',
                color: activeTab === 'actions' ? '#f8fafc' : '#64748b',
                padding: '12px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Действия ({report.breadcrumbs.length})
            </button>

            <button
              onClick={() => setActiveTab('environment')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'environment' ? '2px solid #0284c7' : '2px solid transparent',
                color: activeTab === 'environment' ? '#f8fafc' : '#64748b',
                padding: '12px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Окружение
            </button>
          </div>

          {/* Содержимое вкладки */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* ВКЛАДКА: СЕТЬ */}
            {activeTab === 'network' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.network.length === 0 ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '40px', fontSize: '13px' }}>Запросов не зафиксировано</div>
                ) : (
                  report.network.map((req, idx) => {
                    const offset = getOffset(req.t_start);
                    const isSynced = Math.abs(currentTime - offset) < 1.5;
                    const isFailed = req.status === null || req.status >= 400;
                    const isExpanded = expandedNetworkIdx === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => seekVideo(offset)}
                        style={{
                          background: isSynced ? 'rgba(2, 132, 199, 0.15)' : '#090d16',
                          border: isSynced ? '1px solid #38bdf8' : isFailed ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #1e293b',
                          borderRadius: '6px',
                          padding: '9px 12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              background: '#1e293b',
                              color: '#38bdf8',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              fontWeight: 600
                            }}>
                              {formatTime(offset)}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '11px', color: '#94a3b8' }}>{req.method}</span>
                            <span style={{
                              color: isFailed ? '#f87171' : '#34d399',
                              fontWeight: 600,
                              fontSize: '11px'
                            }}>
                              {req.pending ? 'PENDING' : req.status === null ? 'ERROR' : req.status}
                            </span>
                            <span style={{
                              fontSize: '12px',
                              color: '#e2e8f0',
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {req.url}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {req.duration_ms !== null ? `${req.duration_ms}ms` : 'waiting...'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedNetworkIdx(isExpanded ? null : idx);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#38bdf8',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              {isExpanded ? 'Скрыть' : 'Детали'}
                            </button>
                          </div>
                        </div>

                        {/* Раскрывающийся JSON */}
                        {isExpanded && (
                          <div style={{
                            marginTop: '10px',
                            paddingTop: '10px',
                            borderTop: '1px solid #1e293b',
                            fontSize: '11px',
                            fontFamily: 'monospace'
                          }}>
                            {req.request && (
                              <div style={{ marginBottom: '8px' }}>
                                <div style={{ color: '#64748b' }}>Заголовки запроса:</div>
                                <pre style={{ margin: '4px 0', background: '#020617', padding: '6px', borderRadius: '4px', overflowX: 'auto' }}>
                                  {JSON.stringify(req.request.headers, null, 2)}
                                </pre>
                              </div>
                            )}

                            {req.response && (
                              <div>
                                <div style={{ color: '#64748b' }}>Ответ сервера:</div>
                                <pre style={{ margin: '4px 0', background: '#020617', padding: '6px', borderRadius: '4px', overflowX: 'auto', color: isFailed ? '#fca5a5' : '#86efac' }}>
                                  {req.response.body || '[Empty]'}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ВКЛАДКА: КОНСОЛЬ (С ЗАЩИТОЙ ОТ XSS: <img src=x onerror=...> ВЫВОДИТСЯ ТЕКСТОМ) */}
            {activeTab === 'console' && (
              <div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  <button
                    onClick={() => setConsoleFilter('all')}
                    style={{
                      background: consoleFilter === 'all' ? '#0284c7' : '#090d16',
                      border: '1px solid #1e293b',
                      color: 'white',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Все ({report.console.length})
                  </button>
                  <button
                    onClick={() => setConsoleFilter('error')}
                    style={{
                      background: consoleFilter === 'error' ? 'rgba(239, 68, 68, 0.2)' : '#090d16',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Ошибки ({report.console.filter(c => c.level === 'error').length})
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredConsole.length === 0 ? (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '40px', fontSize: '13px' }}>Записей консоли нет</div>
                  ) : (
                    filteredConsole.map((log, idx) => {
                      const offset = getOffset(log.t);
                      const isSynced = Math.abs(currentTime - offset) < 1.5;
                      const isError = log.level === 'error';
                      const isExpanded = expandedConsoleIdx === idx;

                      return (
                        <div
                          key={idx}
                          onClick={() => seekVideo(offset)}
                          style={{
                            background: isSynced ? 'rgba(2, 132, 199, 0.15)' : '#090d16',
                            border: isSynced ? '1px solid #38bdf8' : isError ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #1e293b',
                            borderRadius: '6px',
                            padding: '9px 12px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{
                              background: '#1e293b',
                              color: '#38bdf8',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              fontWeight: 600
                            }}>
                              {formatTime(offset)}
                            </span>
                            <span style={{
                              fontWeight: 600,
                              fontSize: '11px',
                              color: isError ? '#f87171' : log.level === 'warn' ? '#fbbf24' : '#38bdf8'
                            }}>
                              [{log.level.toUpperCase()}]
                            </span>

                            {/* ВАЖНО: React рендерит {log.message} строго как чистый текст через textContent.
                                Никакие теги <img src=x onerror=...> физически не выполняются! */}
                            <span style={{ color: '#f8fafc', flex: 1, wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '11px' }}>
                              {log.message}
                            </span>
                          </div>

                          {log.stack && (
                            <div style={{ marginTop: '6px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedConsoleIdx(isExpanded ? null : idx);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#38bdf8',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                {isExpanded ? 'Скрыть Stack Trace' : 'Показать Stack Trace'}
                              </button>
                              {isExpanded && (
                                <pre style={{
                                  margin: '6px 0 0 0',
                                  background: '#020617',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  color: '#fca5a5',
                                  overflowX: 'auto',
                                  fontFamily: 'monospace'
                                }}>
                                  {log.stack}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ВКЛАДКА: ДЕЙСТВИЯ (BREADCRUMBS С ВРЕМЕНЕМ) */}
            {activeTab === 'actions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.breadcrumbs.length === 0 && (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '40px', fontSize: '13px' }}>Действий не зафиксировано</div>
                )}
                {report.breadcrumbs.map((b, idx) => {
                  const offset = getOffset(b.t);
                  const isSynced = Math.abs(currentTime - offset) < 1.5;

                  return (
                    <div
                      key={idx}
                      onClick={() => seekVideo(offset)}
                      style={{
                        background: isSynced ? 'rgba(2, 132, 199, 0.15)' : '#090d16',
                        border: isSynced ? '1px solid #38bdf8' : '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px'
                      }}
                    >
                      <span style={{
                        background: '#1e293b',
                        color: '#38bdf8',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {formatTime(offset)}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '11px' }}>{b.kind}</span>
                      <span style={{ fontFamily: 'monospace', color: '#f8fafc', fontSize: '11px' }}>{b.target || b.url}</span>
                      {b.text && <span style={{ color: '#94a3b8' }}>("{b.text}")</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ВКЛАДКА: ОКРУЖЕНИЕ */}
            {activeTab === 'environment' && (
              <div style={{
                background: '#090d16',
                padding: '14px',
                borderRadius: '6px',
                border: '1px solid #1e293b',
                fontSize: '11px',
                fontFamily: 'monospace'
              }}>
                <pre style={{ margin: 0, color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(report.environment ?? {}, null, 2)}
                </pre>
                <div style={{ color: '#64748b', margin: '14px 0 6px' }}>Метаданные сайта:</div>
                <pre style={{ margin: 0, color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(report.hostMetadata ?? {}, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно скриншота */}
      {enlargedScreenshotUrl && (
        <div
          role="dialog"
          aria-label="Скриншот"
          onClick={() => setEnlargedScreenshotUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out'
          }}
        >
          <img
            src={enlargedScreenshotUrl}
            alt="Скриншот"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '6px' }}
          />
        </div>
      )}
    </div>
  );
};

interface MediaPanelProps {
  media: ReportMedia;
  hasVideo: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate: () => void;
  onEnlargeScreenshot: (url: string) => void;
}

const MediaPanel: React.FC<MediaPanelProps> = ({ media, hasVideo, videoRef, onTimeUpdate, onEnlargeScreenshot }) => {
  if (media.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Загрузка файлов" style={{ display: 'grid', gap: '12px' }}>
        <Bone width="100%" height={hasVideo ? 280 : 120} radius={6} />
        <Bone width={160} height={90} radius={6} />
      </div>
    );
  }
  if (media.status === 'error') {
    return (
      <div role="alert" style={{ padding: '60px', textAlign: 'center', color: '#f87171', background: '#090d16', borderRadius: '6px' }}>
        Не удалось загрузить видео и скриншоты
      </div>
    );
  }

  return (
    <>
      {media.videoUrl ? (
        <div>
          <video
            ref={videoRef}
            src={media.videoUrl}
            controls
            onTimeUpdate={onTimeUpdate}
            style={{
              width: '100%',
              borderRadius: '6px',
              background: '#000000',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              display: 'block'
            }}
          />
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>
            Клик по событию в логах справа перемещает видео на соответствующий кадр.
          </p>
        </div>
      ) : (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', background: '#090d16', borderRadius: '6px' }}>
          Видеозапись отсутствует
        </div>
      )}

      {media.screenshotUrls.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: '#94a3b8' }}>
            Скриншоты ({media.screenshotUrls.length}):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {media.screenshotUrls.map((url, index) => (
              <button
                key={url}
                type="button"
                aria-label={`Увеличить скриншот ${index + 1}`}
                onClick={() => onEnlargeScreenshot(url)}
                style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in' }}
              >
                <img
                  src={url}
                  alt={`Скриншот ${index + 1}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '160px',
                    borderRadius: '6px',
                    border: '1px solid #1e293b',
                    display: 'block'
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
