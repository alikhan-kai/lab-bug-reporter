import React, { useRef, useState } from 'react';
import { ReportItem, ReportStatus } from '../types';

interface ReportDetailProps {
  report: ReportItem;
  onBack: () => void;
  onStatusChange: (id: string, newStatus: ReportStatus) => void;
  onDeleteReport: (id: string) => void;
}

export const ReportDetail: React.FC<ReportDetailProps> = ({
  report,
  onBack,
  onStatusChange,
  onDeleteReport
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'network' | 'console' | 'actions' | 'environment'>('network');
  const [expandedNetworkIdx, setExpandedNetworkIdx] = useState<number | null>(null);
  const [expandedConsoleIdx, setExpandedConsoleIdx] = useState<number | null>(null);
  const [consoleFilter, setConsoleFilter] = useState<'all' | 'error' | 'warn'>('all');
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  // Вычисление смещения относительно старта видео
  const getOffset = (t: number): number => {
    if (!report.recordingStartTime) return 0;
    return Math.max(0, (t - report.recordingStartTime) / 1000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Перемотка видео при клике на строку лога (Ключевая фишка Jam.dev!)
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
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Кнопка "Назад" и верхняя панель действий */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button
          onClick={onBack}
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#f8fafc',
            padding: '8px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ← Назад к списку отчетов
        </button>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Смена статуса (для триажеров и админов) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Статус отчета:</span>
            <select
              value={report.status}
              onChange={(e) => onStatusChange(report.id, e.target.value as ReportStatus)}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#f8fafc',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="new">Новый</option>
              <option value="in_progress">В работе</option>
              <option value="resolved">Решено</option>
              <option value="wont_fix">Отклонено</option>
            </select>
          </div>

          <button
            onClick={() => {
              if (confirm('Вы уверены, что хотите удалить отчет и все файлы?')) {
                onDeleteReport(report.id);
              }
            }}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Удалить отчет
          </button>
        </div>
      </div>

      {/* Заголовок отчета */}
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', fontSize: '15px' }}>{report.id}</span>
          <span style={{ color: '#94a3b8' }}>•</span>
          <span style={{ color: '#cbd5e1', fontSize: '13px' }}>{report.projectName}</span>
          <span style={{ color: '#94a3b8' }}>•</span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(report.createdAt).toLocaleString()}</span>
        </div>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>{report.title}</h1>
        <p style={{ margin: '0 0 16px 0', color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6 }}>{report.description}</p>

        {/* Компактная плашка метаданных */}
        <div style={{
          background: '#0f172a',
          borderRadius: '6px',
          padding: '12px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          fontSize: '12px',
          border: '1px solid #334155'
        }}>
          <div>
            <span style={{ color: '#94a3b8', display: 'block' }}>Пользователь:</span>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{report.reporter.email}</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block' }}>Страница (URL):</span>
            <a href={report.pageUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
              {report.pageUrl}
            </a>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block' }}>Браузер / ОС:</span>
            <span style={{ color: '#f8fafc' }}>{report.environment.browser} • {report.environment.os}</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block' }}>Разрешение экрана:</span>
            <span style={{ color: '#f8fafc' }}>{report.environment.viewport[0]}x{report.environment.viewport[1]} px</span>
          </div>
        </div>
      </div>

      {/* РАЗДЕЛЕНИЕ ЭКРАНА 50 / 50: Слева Видео Jam.dev, Справа Логи с таймкодами */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* ЛЕВАЯ КОЛОНКА: ВИДЕО И СКРИНШОТ */}
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
              🎥 Запись экрана пользователя
            </h3>
            <span style={{
              background: '#0284c7',
              color: 'white',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              {formatTime(currentTime)}
            </span>
          </div>

          {report.videoUrl ? (
            <div>
              <video
                ref={videoRef}
                src={report.videoUrl}
                controls
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  background: '#000000',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  display: 'block'
                }}
              />
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                💡 <em>Кликайте по любой строке в логах справа, чтобы перематывать видео на точный момент события.</em>
              </p>
            </div>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', background: '#0f172a', borderRadius: '8px' }}>
              Видеозапись не прикреплена к этому отчету
            </div>
          )}

          {/* Скриншот */}
          {report.screenshotUrl && (
            <div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#f8fafc' }}>📷 Прикрепленный скриншот:</div>
              <img
                src={report.screenshotUrl}
                alt="Скриншот проблемы"
                onClick={() => setShowScreenshotModal(true)}
                style={{
                  maxWidth: '100%',
                  maxHeight: '160px',
                  borderRadius: '6px',
                  cursor: 'zoom-in',
                  border: '1px solid #334155',
                  transition: 'opacity 0.2s'
                }}
              />
            </div>
          )}
        </div>

        {/* ПРАВАЯ КОЛОНКА: СИНХРОНИЗИРОВАННЫЕ ЛОГИ (JAM.DEV СТИЛЬ) */}
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '620px'
        }}>
          {/* Вкладки логов */}
          <div style={{
            background: '#0f172a',
            borderBottom: '1px solid #334155',
            display: 'flex',
            padding: '0 8px'
          }}>
            <button
              onClick={() => setActiveTab('network')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'network' ? '2px solid #0284c7' : '2px solid transparent',
                color: activeTab === 'network' ? '#f8fafc' : '#94a3b8',
                padding: '12px 16px',
                fontSize: '13px',
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
                color: activeTab === 'console' ? '#f8fafc' : '#94a3b8',
                padding: '12px 16px',
                fontSize: '13px',
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
                color: activeTab === 'actions' ? '#f8fafc' : '#94a3b8',
                padding: '12px 16px',
                fontSize: '13px',
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
                color: activeTab === 'environment' ? '#f8fafc' : '#94a3b8',
                padding: '12px 16px',
                fontSize: '13px',
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
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Сетевых запросов не зафиксировано</div>
                ) : (
                  report.network.map((req, idx) => {
                    const offset = getOffset(req.t_start);
                    const isSynced = Math.abs(currentTime - offset) < 1.5;
                    const isFailed = req.status >= 400 || req.status === 0;
                    const isExpanded = expandedNetworkIdx === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => seekVideo(offset)}
                        style={{
                          background: isSynced ? '#1e3a5f' : '#0f172a',
                          border: isSynced ? '1px solid #38bdf8' : isFailed ? '1px solid #ef4444' : '1px solid #334155',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              background: '#334155',
                              color: '#38bdf8',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              {formatTime(offset)}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '12px', color: '#cbd5e1' }}>{req.method}</span>
                            <span style={{
                              color: isFailed ? '#ef4444' : '#10b981',
                              fontWeight: 700,
                              fontSize: '12px'
                            }}>
                              {req.status === 0 ? 'FAIL' : req.status}
                            </span>
                            <span style={{
                              fontSize: '12px',
                              color: '#cbd5e1',
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {req.url}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{req.duration_ms} мс</span>
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

                        {/* Раскрывающийся блок деталей запроса (Headers, Body) */}
                        {isExpanded && (
                          <div style={{
                            marginTop: '10px',
                            paddingTop: '10px',
                            borderTop: '1px solid #334155',
                            fontSize: '11px',
                            fontFamily: 'monospace'
                          }}>
                            {req.request && (
                              <div style={{ marginBottom: '8px' }}>
                                <div style={{ color: '#94a3b8', fontWeight: 600 }}>Заголовки запроса:</div>
                                <pre style={{ margin: '4px 0', background: '#090d16', padding: '6px', borderRadius: '4px', overflowX: 'auto' }}>
                                  {JSON.stringify(req.request.headers, null, 2)}
                                </pre>
                                {req.request.body && (
                                  <div>
                                    <div style={{ color: '#94a3b8', fontWeight: 600 }}>Тело запроса:</div>
                                    <pre style={{ margin: '4px 0', background: '#090d16', padding: '6px', borderRadius: '4px', overflowX: 'auto' }}>
                                      {req.request.body}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}

                            {req.response && (
                              <div>
                                <div style={{ color: '#94a3b8', fontWeight: 600 }}>Ответ сервера:</div>
                                <pre style={{ margin: '4px 0', background: '#090d16', padding: '6px', borderRadius: '4px', overflowX: 'auto', color: isFailed ? '#fca5a5' : '#86efac' }}>
                                  {req.response.body || '[Empty response body]'}
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

            {/* ВКЛАДКА: КОНСОЛЬ */}
            {activeTab === 'console' && (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    onClick={() => setConsoleFilter('all')}
                    style={{
                      background: consoleFilter === 'all' ? '#0284c7' : '#334155',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Все ({report.console.length})
                  </button>
                  <button
                    onClick={() => setConsoleFilter('error')}
                    style={{
                      background: consoleFilter === 'error' ? '#ef4444' : '#334155',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Ошибки ({report.console.filter(c => c.level === 'error').length})
                  </button>
                  <button
                    onClick={() => setConsoleFilter('warn')}
                    style={{
                      background: consoleFilter === 'warn' ? '#f59e0b' : '#334155',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Предупреждения ({report.console.filter(c => c.level === 'warn').length})
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredConsole.length === 0 ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Записей в консоли не найдено</div>
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
                            background: isSynced ? '#1e3a5f' : '#0f172a',
                            border: isSynced ? '1px solid #38bdf8' : isError ? '1px solid #ef4444' : '1px solid #334155',
                            borderRadius: '6px',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{
                              background: '#334155',
                              color: '#38bdf8',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              {formatTime(offset)}
                            </span>
                            <span style={{
                              fontWeight: 700,
                              color: isError ? '#ef4444' : log.level === 'warn' ? '#f59e0b' : '#38bdf8'
                            }}>
                              [{log.level.toUpperCase()}]
                            </span>
                            {/* Защита от XSS: рендерим через textContent в React! */}
                            <span style={{ color: '#f8fafc', flex: 1, wordBreak: 'break-word', fontFamily: 'monospace' }}>
                              {log.message}
                            </span>
                          </div>

                          {log.stack && (
                            <div style={{ marginTop: '8px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedConsoleIdx(isExpanded ? null : idx);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#38bdf8',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                {isExpanded ? '▼ Скрыть Stack Trace' : '▶ Раскрыть Stack Trace'}
                              </button>
                              {isExpanded && (
                                <pre style={{
                                  margin: '6px 0 0 0',
                                  background: '#090d16',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
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

            {/* ВКЛАДКА: ДЕЙСТВИЯ (BREADCRUMBS) */}
            {activeTab === 'actions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.breadcrumbs.length === 0 ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Действий не зафиксировано</div>
                ) : (
                  report.breadcrumbs.map((b, idx) => {
                    const offset = getOffset(b.t);
                    const isSynced = Math.abs(currentTime - offset) < 1.5;

                    return (
                      <div
                        key={idx}
                        onClick={() => seekVideo(offset)}
                        style={{
                          background: isSynced ? '#1e3a5f' : '#0f172a',
                          border: isSynced ? '1px solid #38bdf8' : '1px solid #334155',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '12px'
                        }}
                      >
                        <span style={{
                          background: '#334155',
                          color: '#38bdf8',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {formatTime(offset)}
                        </span>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{b.kind.toUpperCase()}:</span>
                        <span style={{ fontFamily: 'monospace', color: '#f8fafc' }}>{b.target || b.url}</span>
                        {b.text && <span style={{ color: '#94a3b8' }}>("{b.text}")</span>}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ВКЛАДКА: ОКРУЖЕНИЕ */}
            {activeTab === 'environment' && (
              <div style={{
                background: '#0f172a',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #334155',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '10px' }}>ДАННЫЕ ОКРУЖЕНИЯ КЛИЕНТА:</div>
                <pre style={{ margin: 0, color: '#cbd5e1' }}>
                  {JSON.stringify(report.environment, null, 2)}
                </pre>
                <div style={{ color: '#38bdf8', fontWeight: 700, margin: '16px 0 10px 0' }}>МЕТАДАННЫЕ ПРИЛОЖЕНИЯ:</div>
                <pre style={{ margin: 0, color: '#cbd5e1' }}>
                  {JSON.stringify(report.hostMetadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно скриншота */}
      {showScreenshotModal && (
        <div
          onClick={() => setShowScreenshotModal(false)}
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
            src={report.screenshotUrl}
            alt="Полноразмерный скриншот"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
          />
        </div>
      )}
    </div>
  );
};
