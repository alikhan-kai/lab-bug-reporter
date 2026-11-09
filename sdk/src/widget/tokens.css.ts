/**
 * Токены дизайна виджета (стилизация в духе campus.codes / modern UI)
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
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
  transition: all 0.2s ease-in-out;
  z-index: 2147483640;
}

.lab-launcher:hover {
  background: var(--lab-primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(2, 132, 199, 0.5);
}

.lab-launcher.hidden {
  display: none !important;
}

/* Затемнение фона */
.lab-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
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
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 2147483646;
}

.lab-sidebar.open {
  transform: translateX(0);
}

/* Заголовок сайдбара */
.lab-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--lab-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lab-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
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
}

.lab-close-btn:hover {
  background: var(--lab-surface);
  color: var(--lab-text);
}

/* Тело формы */
.lab-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Переключатель типа (Segmented control) */
.lab-type-selector {
  display: flex;
  background: var(--lab-surface);
  padding: 4px;
  border-radius: var(--lab-radius);
  border: 1px solid var(--lab-border);
}

.lab-type-btn {
  flex: 1;
  background: transparent;
  border: none;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--lab-text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.lab-type-btn.active {
  background: #ffffff;
  color: var(--lab-text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.lab-input, .lab-textarea {
  width: 100%;
  border: 1px solid var(--lab-border);
  border-radius: var(--lab-radius);
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--lab-text);
  background: #ffffff;
  transition: border-color 0.2s;
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
  padding: 10px 12px;
  border-radius: var(--lab-radius);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s;
}

.lab-btn-outline:hover {
  background: #ffffff;
  border-color: #cbd5e1;
}

.lab-btn-outline.recording {
  background: var(--lab-danger-bg);
  color: var(--lab-danger);
  border-color: var(--lab-danger);
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
  font-size: 13px;
}

.lab-attachment-name {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lab-btn-remove {
  background: transparent;
  border: none;
  color: var(--lab-danger);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
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
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;
}

.lab-submit-btn:hover {
  background: var(--lab-primary-hover);
}

.lab-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Экран успеха */
.lab-success-view {
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  height: 100%;
}

.lab-success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #dcfce7;
  color: #166534;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 16px;
}

.lab-ref-badge {
  background: var(--lab-surface);
  border: 1px solid var(--lab-border);
  padding: 6px 12px;
  border-radius: 6px;
  font-family: monospace;
  font-weight: 700;
  margin: 12px 0 20px 0;
  display: inline-block;
}
`;
