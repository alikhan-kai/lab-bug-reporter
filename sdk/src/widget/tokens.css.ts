/**
 * Токены дизайна виджета (стилизация в стиле campus.codes / Linear / Apple UI)
 */
export const widgetStyles = `
:host {
  --lab-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
  --lab-primary: #0284c7;
  --lab-primary-hover: #0369a1;
  --lab-bg: #ffffff;
  --lab-surface: #f8fafc;
  --lab-border: #e2e8f0;
  --lab-text: #0f172a;
  --lab-text-muted: #64748b;
  --lab-danger: #ef4444;
  --lab-danger-bg: #fee2e2;
  --lab-radius: 8px;
  --lab-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  --lab-ease: cubic-bezier(0.16, 1, 0.3, 1);
  font-family: var(--lab-font);
  color: var(--lab-text);
  box-sizing: border-box;
}

*, *:before, *:after {
  box-sizing: border-box;
}

/* Плавающая кнопка launcher */
.lab-launcher {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--lab-primary);
  color: #ffffff;
  border: none;
  border-radius: 9999px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
  transition: transform 0.25s var(--lab-ease), box-shadow 0.25s var(--lab-ease), background 0.2s;
  z-index: 2147483640;
}

.lab-launcher:hover {
  background: var(--lab-primary-hover);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 18px rgba(2, 132, 199, 0.45);
}

.lab-launcher:active {
  transform: translateY(0) scale(0.98);
}

.lab-launcher.hidden {
  display: none !important;
}

/* ПЛАВАЮЩАЯ ПАНЕЛЬ ЗАПИСИ (Jam.dev стиль, сверху экрана) */
.lab-recording-bar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: #ffffff;
  border-radius: 9999px;
  padding: 8px 16px 8px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  z-index: 2147483647;
  animation: slideDown 0.3s var(--lab-ease);
  transition: transform 0.2s var(--lab-ease);
}

@keyframes slideDown {
  from { transform: translate(-50%, -100%); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}

.lab-recording-bar.hidden {
  display: none !important;
}

.lab-rec-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  animation: pulseDot 1s infinite;
}

@keyframes pulseDot {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.6; }
  100% { transform: scale(1); opacity: 1; }
}

.lab-rec-time {
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.lab-bar-stop-btn {
  background: #ef4444;
  color: #ffffff;
  border: none;
  border-radius: 9999px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s, transform 0.15s;
}

.lab-bar-stop-btn:hover {
  background: #dc2626;
  transform: scale(1.02);
}

.lab-bar-stop-btn:active {
  transform: scale(0.96);
}

/* Затемнение фона */
.lab-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s var(--lab-ease);
  z-index: 2147483645;
}

.lab-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

/* Выезжающий сайдбар */
.lab-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  max-width: 100vw;
  background: var(--lab-bg);
  box-shadow: var(--lab-shadow);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.35s var(--lab-ease);
  z-index: 2147483646;
}

.lab-sidebar.open {
  transform: translateX(0);
}

/* Заголовок сайдбара */
.lab-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--lab-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lab-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.2px;
}

.lab-close-btn {
  background: transparent;
  border: none;
  color: var(--lab-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--lab-ease);
}

.lab-close-btn:hover {
  background: var(--lab-surface);
  color: var(--lab-text);
  transform: rotate(90deg);
}

/* Тело формы */
.lab-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: opacity 0.2s ease;
}

/* ПЛАВАЮЩИЙ ПЕРЕКЛЮЧАТЕЛЬ С ЭФФЕКТОМ СКОЛЬЖЕНИЯ (SLIDING PILL) */
.lab-type-selector {
  position: relative;
  display: flex;
  background: var(--lab-surface);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--lab-border);
  user-select: none;
}

/* Скользящий белый ползунок-подложка */
.lab-type-indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc(33.333% - 2px);
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: transform 0.28s var(--lab-ease);
  z-index: 1;
  pointer-events: none;
}

.lab-type-btn {
  position: relative;
  z-index: 2;
  flex: 1;
  background: transparent;
  border: none;
  padding: 7px 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--lab-text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.25s var(--lab-ease), transform 0.15s ease;
}

.lab-type-btn:hover {
  color: var(--lab-text);
}

.lab-type-btn:active {
  transform: scale(0.96);
}

.lab-type-btn.active {
  color: var(--lab-primary);
  font-weight: 600;
}

/* Поля ввода */
.lab-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lab-field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--lab-text-muted);
}

.lab-input, .lab-textarea {
  width: 100%;
  border: 1px solid var(--lab-border);
  border-radius: var(--lab-radius);
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  color: var(--lab-text);
  background: #ffffff;
  transition: border-color 0.2s var(--lab-ease), box-shadow 0.2s var(--lab-ease), background 0.2s;
}

.lab-input:focus, .lab-textarea:focus {
  outline: none;
  border-color: var(--lab-primary);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.lab-textarea {
  resize: vertical;
  min-height: 80px;
}

/* Кнопки медиа */
.lab-media-actions {
  display: flex;
  gap: 10px;
}

.lab-btn-outline {
  flex: 1;
  border: 1px solid var(--lab-border);
  background: var(--lab-surface);
  color: var(--lab-text);
  padding: 9px 12px;
  border-radius: var(--lab-radius);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s var(--lab-ease);
}

.lab-btn-outline:hover:not(:disabled) {
  background: #ffffff;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.lab-btn-outline:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.lab-btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Превью вложений */
.lab-attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lab-attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--lab-border);
  border-radius: var(--lab-radius);
  background: var(--lab-surface);
  font-size: 12px;
  animation: attachFadeIn 0.25s var(--lab-ease);
  transition: background 0.2s;
}

@keyframes attachFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.lab-attachment-name {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.lab-btn-remove {
  background: transparent;
  border: none;
  color: var(--lab-danger);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.lab-btn-remove:hover {
  background: var(--lab-danger-bg);
}

/* Блок ошибки загрузки (Inline Error с Retry) */
.lab-error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 10px 12px;
  border-radius: var(--lab-radius);
  font-size: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
  animation: attachFadeIn 0.25s var(--lab-ease);
}

.lab-error-banner.hidden {
  display: none !important;
}

/* Полоса прогресса отправки */
.lab-progress-container {
  width: 100%;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  display: none;
  margin-top: 4px;
}

.lab-progress-container.active {
  display: block;
}

.lab-progress-bar {
  height: 100%;
  width: 0%;
  background: var(--lab-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Нижняя панель отправки */
.lab-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--lab-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lab-submit-btn {
  background: var(--lab-primary);
  color: white;
  border: none;
  border-radius: var(--lab-radius);
  padding: 11px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s var(--lab-ease);
}

.lab-submit-btn:hover:not(:disabled) {
  background: var(--lab-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
}

.lab-submit-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.lab-submit-btn.retry-mode {
  background: #dc2626;
}

.lab-submit-btn.retry-mode:hover:not(:disabled) {
  background: #b91c1c;
}

.lab-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ЭКРАН УСПЕХА */
.lab-success-view {
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 24px;
  flex: 1;
  animation: attachFadeIn 0.3s var(--lab-ease);
}

.lab-success-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #dcfce7;
  color: #166534;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
  animation: scaleSuccess 0.4s var(--lab-ease);
}

@keyframes scaleSuccess {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}

.lab-ref-badge {
  background: var(--lab-surface);
  border: 1px solid var(--lab-border);
  padding: 6px 14px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--lab-primary);
  margin: 12px 0 24px 0;
  display: inline-block;
}

.lab-success-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}

.lab-btn-secondary {
  flex: 1;
  background: var(--lab-surface);
  border: 1px solid var(--lab-border);
  color: var(--lab-text);
  padding: 10px 14px;
  border-radius: var(--lab-radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--lab-ease);
}

.lab-btn-secondary:hover {
  background: #ffffff;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.lab-btn-primary {
  flex: 1;
  background: var(--lab-primary);
  border: 1px solid transparent;
  color: white;
  padding: 10px 14px;
  border-radius: var(--lab-radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--lab-ease);
}

.lab-btn-primary:hover {
  background: var(--lab-primary-hover);
  transform: translateY(-1px);
}
`;
