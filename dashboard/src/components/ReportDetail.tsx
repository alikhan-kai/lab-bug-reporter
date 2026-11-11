import React, { useRef, useState } from 'react';
import type { ReportStatus, ReportType } from '../api/types';
import { reportHref } from '../hooks/useReportRoute';
import type { ConsoleEntry, NetworkEntry, ReportMedia, ReportView } from '../types';
import { Bone, SkeletonStyles } from './Skeleton';
import { StatusBadge } from './StatusBadge';

const REPORT_TYPE_LABELS: Record<ReportType, string> = { bug: 'Баг', feature: 'Предложение', question: 'Вопрос' };
const COPIED_NOTICE_MS = 2000;

type RequestOutcome = 'succeeded' | 'failed' | 'pending';

// A request still waiting when the report was sent is not a failure: it may be the hang the user reports.
function requestOutcomeOf(entry: NetworkEntry): RequestOutcome {
  if (entry.pending) return 'pending';
  if (entry.status === null || entry.status >= 400) return 'failed';
  return 'succeeded';
}

const REQUEST_OUTCOME_COLORS: Record<RequestOutcome, string> = {
  succeeded: '#34d399',
  failed: '#f87171',
  pending: '#fbbf24'
};

const REQUEST_OUTCOME_BORDERS: Record<RequestOutcome, string> = {
  succeeded: '1px solid #1e293b',
  failed: '1px solid rgba(239, 68, 68, 0.4)',
  pending: '1px solid rgba(245, 158, 11, 0.4)'
};

function formatDuration(milliseconds: number): string {
  return milliseconds < 1000 ? `${milliseconds} мс` : `${(milliseconds / 1000).toFixed(1)} с`;
}

function describeRequestDuration(entry: NetworkEntry): string {
  if (entry.pending) return entry.duration_ms !== null ? `без ответа ${formatDuration(entry.duration_ms)}` : 'без ответа';
  return entry.duration_ms !== null ? formatDuration(entry.duration_ms) : '—';
}

/**
 * The moment log times count from. With a video it is the recording start, so a time matches the video. Without
 * one it is the first captured event, so the entries still read as a timeline instead of all showing 0:00.
 */
function findTimeOrigin(report: ReportView): number | null {
  if (report.recordingStartTime) return report.recordingStartTime;
  const times = [
    ...report.console.map((entry) => entry.t),
    ...report.network.map((entry) => entry.t_start),
    ...report.breadcrumbs.map((entry) => entry.t)
  ].filter(Number.isFinite);
  return times.length > 0 ? Math.min(...times) : null;
}

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
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const environment = describeEnvironment(report.environment);
  const hasVideo = report.attachments.some((attachment) => attachment.kind === 'video');
  const timeOrigin = findTimeOrigin(report);
  // Entries move the video only when there is one to move and the times are measured from its start.
  const canSeek = media.video.status === 'ready' && media.video.value !== null && report.recordingStartTime !== null;

  const getOffset = (t: number): number => (timeOrigin === null ? 0 : Math.max(0, (t - timeOrigin) / 1000));
  const isPlayingAt = (offset: number): boolean => canSeek && Math.abs(currentTime - offset) < 1.5;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Перемотка видео при клике на строку лога (Jam.dev синхронизация)
  const seekVideo = (offsetSeconds: number) => {
    if (!canSeek || !videoRef.current) return;
    videoRef.current.currentTime = offsetSeconds;
    videoRef.current.play().catch((error: unknown) => {
      // The browser may refuse to start playing; the video still shows the frame it moved to.
      console.warn('The video did not start playing', error);
    });
  };

  // An entry that moves the video works like a button, also from the keyboard.
  const seekProps = (offset: number): React.HTMLAttributes<HTMLDivElement> => canSeek
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: () => seekVideo(offset),
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            seekVideo(offset);
          }
        }
      }
    : {};

  const copyLink = () => {
    navigator.clipboard.writeText(reportHref(report.id))
      .then(() => {
        setIsLinkCopied(true);
        window.setTimeout(() => setIsLinkCopied(false), COPIED_NOTICE_MS);
      })
      .catch((error: unknown) => console.error('Cannot copy the report link', error));
  };

  // Entries keep their place in the whole list, so an expanded stack trace stays with its entry across filters.
  const filteredConsole: { entry: ConsoleEntry; index: number }[] = report.console
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => consoleFilter === 'all' || entry.level === consoleFilter);
  const consoleCount = (level: ConsoleEntry['level']) => report.console.filter((entry) => entry.level === level).length;

  return (
    <div style={{ padding: '28px 16px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* The video and the screenshots show bones while they load. */}
      <SkeletonStyles />
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
          <button
            type="button"
            onClick={copyLink}
            style={{
              background: 'transparent',
              border: '1px solid #1e293b',
              color: '#cbd5e1',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            {isLinkCopied ? 'Ссылка скопирована' : 'Скопировать ссылку'}
          </button>

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
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{REPORT_TYPE_LABELS[report.type]}</span>
          <span style={{ color: '#334155' }}>•</span>
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
            <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{report.reporter.email ?? report.reporter.id ?? 'Не указан'}</span>
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
            {hasVideo && (
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
            )}
          </div>

          <MediaPanel
            media={media}
            hasVideo={hasVideo}
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
          <div role="tablist" aria-label="Данные отчета" style={{
            background: '#090d16',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            padding: '0 8px'
          }}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'network'}
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
              type="button"
              role="tab"
              aria-selected={activeTab === 'console'}
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
              type="button"
              role="tab"
              aria-selected={activeTab === 'actions'}
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
              type="button"
              role="tab"
              aria-selected={activeTab === 'environment'}
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
          <div role="tabpanel" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {activeTab !== 'environment' && timeOrigin !== null && (
              <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#64748b' }}>
                {canSeek
                  ? 'Время от начала записи. Клик по событию перематывает видео.'
                  : hasVideo
                    ? 'Время от начала записи.'
                    : 'Видео нет, время отсчитывается от первого события отчета.'}
              </p>
            )}
            {/* ВКЛАДКА: СЕТЬ */}
            {activeTab === 'network' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.network.length === 0 ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '40px', fontSize: '13px' }}>Запросов не зафиксировано</div>
                ) : (
                  report.network.map((req, idx) => {
                    const offset = getOffset(req.t_start);
                    const isSynced = isPlayingAt(offset);
                    const outcome = requestOutcomeOf(req);
                    const isExpanded = expandedNetworkIdx === idx;

                    return (
                      <div
                        key={idx}
                        {...seekProps(offset)}
                        style={{
                          background: isSynced ? 'rgba(2, 132, 199, 0.15)' : '#090d16',
                          border: isSynced ? '1px solid #38bdf8' : REQUEST_OUTCOME_BORDERS[outcome],
                          borderRadius: '6px',
                          padding: '9px 12px',
                          cursor: canSeek ? 'pointer' : 'default',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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
                              color: REQUEST_OUTCOME_COLORS[outcome],
                              fontWeight: 600,
                              fontSize: '11px'
                            }}>
                              {req.pending ? 'PENDING' : req.status === null ? 'ERROR' : req.status}
                            </span>
                            <span title={req.url} style={{
                              fontSize: '12px',
                              color: '#e2e8f0',
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {req.url}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {describeRequestDuration(req)}
                            </span>
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              onKeyDown={(e) => e.stopPropagation()}
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

                        {/* Заголовки и тела запроса и ответа, как текст */}
                        {isExpanded && <RequestDetails entry={req} outcome={outcome} />}
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
                    type="button"
                    aria-pressed={consoleFilter === 'all'}
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
                    type="button"
                    aria-pressed={consoleFilter === 'error'}
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
                    Ошибки ({consoleCount('error')})
                  </button>
                  <button
                    type="button"
                    aria-pressed={consoleFilter === 'warn'}
                    onClick={() => setConsoleFilter('warn')}
                    style={{
                      background: consoleFilter === 'warn' ? 'rgba(245, 158, 11, 0.2)' : '#090d16',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Предупреждения ({consoleCount('warn')})
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredConsole.length === 0 ? (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '40px', fontSize: '13px' }}>Записей консоли нет</div>
                  ) : (
                    filteredConsole.map(({ entry: log, index: idx }) => {
                      const offset = getOffset(log.t);
                      const isSynced = isPlayingAt(offset);
                      const isError = log.level === 'error';
                      const isExpanded = expandedConsoleIdx === idx;

                      return (
                        <div
                          key={idx}
                          {...seekProps(offset)}
                          style={{
                            background: isSynced ? 'rgba(2, 132, 199, 0.15)' : '#090d16',
                            border: isSynced ? '1px solid #38bdf8' : isError ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #1e293b',
                            borderRadius: '6px',
                            padding: '9px 12px',
                            cursor: canSeek ? 'pointer' : 'default',
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
                                type="button"
                                aria-expanded={isExpanded}
                                onKeyDown={(e) => e.stopPropagation()}
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
                  const isSynced = isPlayingAt(offset);

                  return (
                    <div
                      key={idx}
                      {...seekProps(offset)}
                      style={{
                        background: isSynced ? 'rgba(2, 132, 199, 0.15)' : '#090d16',
                        border: isSynced ? '1px solid #38bdf8' : '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        cursor: canSeek ? 'pointer' : 'default',
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
                      <span style={{ fontFamily: 'monospace', color: '#f8fafc', fontSize: '11px', wordBreak: 'break-all' }}>{b.target || b.url}</span>
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

const MediaPanel: React.FC<MediaPanelProps> = ({ media, hasVideo, videoRef, onTimeUpdate, onEnlargeScreenshot }) => (
  <>
    <VideoPlayer video={media.video} hasVideo={hasVideo} videoRef={videoRef} onTimeUpdate={onTimeUpdate} />
    <ScreenshotGallery screenshots={media.screenshots} onEnlarge={onEnlargeScreenshot} />
  </>
);

const mediaMessageStyle: React.CSSProperties = {
  padding: '60px 16px',
  textAlign: 'center',
  background: '#090d16',
  borderRadius: '6px',
  fontSize: '13px'
};

interface VideoPlayerProps {
  video: ReportMedia['video'];
  hasVideo: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, hasVideo, videoRef, onTimeUpdate }) => {
  if (!hasVideo) {
    return <div style={{ ...mediaMessageStyle, color: '#64748b' }}>Видеозапись отсутствует</div>;
  }
  if (video.status === 'error') {
    return <div role="alert" style={{ ...mediaMessageStyle, color: '#f87171' }}>Не удалось загрузить видео</div>;
  }
  if (video.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Загрузка видео" style={{ position: 'relative' }}>
        <Bone width="100%" height={280} radius={6} />
        {video.progress !== null && (
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
            Загрузка видео: {video.progress}%
          </span>
        )}
      </div>
    );
  }
  return (
    <video
      ref={videoRef}
      src={video.value ?? undefined}
      controls
      onLoadedMetadata={(event) => revealDuration(event.currentTarget)}
      onTimeUpdate={onTimeUpdate}
      style={{
        width: '100%',
        borderRadius: '6px',
        background: '#000000',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        display: 'block'
      }}
    />
  );
};

/**
 * MediaRecorder writes WebM without a duration, so the player shows no timeline until it has read to the end.
 * Seeking far past the end makes it find the real duration; it then goes back to the start.
 */
function revealDuration(video: HTMLVideoElement): void {
  if (video.duration !== Infinity) return;
  const returnToStart = () => {
    if (!Number.isFinite(video.duration)) return;
    video.removeEventListener('durationchange', returnToStart);
    video.currentTime = 0;
  };
  video.addEventListener('durationchange', returnToStart);
  video.currentTime = Number.MAX_SAFE_INTEGER;
}

interface ScreenshotGalleryProps {
  screenshots: ReportMedia['screenshots'];
  onEnlarge: (url: string) => void;
}

const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ screenshots, onEnlarge }) => {
  if (screenshots.status === 'ready' && screenshots.value.length === 0) {
    return null;
  }
  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
      {screenshots.status === 'loading' && (
        <div aria-busy="true" aria-label="Загрузка скриншотов" style={{ display: 'flex', gap: '8px' }}>
          <Bone width={160} height={90} radius={6} />
          <Bone width={160} height={90} radius={6} />
        </div>
      )}
      {screenshots.status === 'error' && (
        <div role="alert" style={{ color: '#f87171', fontSize: '12px' }}>Не удалось загрузить скриншоты</div>
      )}
      {screenshots.status === 'ready' && (
        <>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: '#94a3b8' }}>
            Скриншоты ({screenshots.value.length}):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {screenshots.value.map((url, index) => (
              <button
                key={url}
                type="button"
                aria-label={`Увеличить скриншот ${index + 1}`}
                onClick={() => onEnlarge(url)}
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
        </>
      )}
    </div>
  );
};

const detailLabelStyle: React.CSSProperties = { color: '#64748b' };
const detailBlockStyle: React.CSSProperties = {
  margin: '4px 0 8px',
  background: '#020617',
  padding: '6px',
  borderRadius: '4px',
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word'
};

function hasEntries(headers: Record<string, string> | undefined): headers is Record<string, string> {
  return headers !== undefined && Object.keys(headers).length > 0;
}

// Captured values come from the reporting website, so every part is shown as text, never as markup.
const RequestDetails: React.FC<{ entry: NetworkEntry; outcome: RequestOutcome }> = ({ entry, outcome }) => (
  <div
    onClick={(e) => e.stopPropagation()}
    style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1e293b', fontSize: '11px', fontFamily: 'monospace', cursor: 'text' }}
  >
    <div style={detailLabelStyle}>URL:</div>
    <pre style={detailBlockStyle}>{entry.method} {entry.url}</pre>

    {entry.error && (
      <>
        <div style={detailLabelStyle}>Ошибка:</div>
        <pre style={{ ...detailBlockStyle, color: '#fca5a5' }}>{entry.error}</pre>
      </>
    )}
    {outcome === 'pending' && (
      <div style={{ color: '#fbbf24', marginBottom: '8px' }}>Ответа не было, когда отчет отправили.</div>
    )}

    {hasEntries(entry.request?.headers) && (
      <>
        <div style={detailLabelStyle}>Заголовки запроса:</div>
        <pre style={detailBlockStyle}>{JSON.stringify(entry.request.headers, null, 2)}</pre>
      </>
    )}
    {entry.request?.body && (
      <>
        <div style={detailLabelStyle}>Тело запроса{entry.request.body_truncated ? ' (обрезано)' : ''}:</div>
        <pre style={detailBlockStyle}>{entry.request.body}</pre>
      </>
    )}

    {hasEntries(entry.response?.headers) && (
      <>
        <div style={detailLabelStyle}>Заголовки ответа:</div>
        <pre style={detailBlockStyle}>{JSON.stringify(entry.response.headers, null, 2)}</pre>
      </>
    )}
    {entry.response && (
      <>
        <div style={detailLabelStyle}>Ответ сервера{entry.response.body_truncated ? ' (обрезан)' : ''}:</div>
        <pre style={{ ...detailBlockStyle, color: outcome === 'failed' ? '#fca5a5' : '#86efac' }}>
          {entry.response.body || '[пусто]'}
        </pre>
      </>
    )}
  </div>
);
