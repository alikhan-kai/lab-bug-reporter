import { WIDGET_FONT_FAMILY } from './font';

// The campus.codes dark theme. Used by theme: 'dark', and by theme: 'system' when the visitor's system is dark.
const DARK_TOKENS = `
  --lab-primary: #b8f7e4;
  --lab-primary-hover: #9eebd5;
  --lab-primary-soft: #2e3a38;
  --lab-on-primary: #1e2024;

  --lab-bg: #2b2e34;
  --lab-surface: #25272c;
  --lab-muted: #33363d;
  --lab-border: #3b3f47;
  --lab-border-strong: #4b5059;
  --lab-text: #e8eaed;
  --lab-text-secondary: #b3b8c0;
  --lab-text-muted: #9aa0a9;

  --lab-danger: #f5a3a3;
  --lab-danger-bg: #3a2629;
  --lab-danger-border: #5e3338;
  --lab-success: #c9e8b0;
  --lab-success-bg: #2d3b26;
  --lab-bar-bg: #33363d;

  --lab-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3);
  --lab-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4);
  color-scheme: dark;
`;

/**
 * The widget's styles, inside its shadow root, so they never leak into the host site.
 * The tokens are the campus.codes ones (ТЗ, раздел 9). A site can override any --lab-* variable on
 * #lab-reporter-root, for example the accent colour: #lab-reporter-root { --lab-primary: #7c3aed; }
 */
export const widgetStyles = `
:host, .lab-component-host, .lab-component-wrapper {
  --lab-font: '${WIDGET_FONT_FAMILY}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --lab-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --lab-primary: #4c9be8;
  --lab-primary-hover: #3a80c9;
  --lab-primary-soft: #f0f7ff;
  --lab-on-primary: #ffffff;

  --lab-bg: #ffffff;
  --lab-surface: #f8f9fa;
  --lab-muted: #f0f1f3;
  --lab-border: #dee2e6;
  --lab-border-strong: #d1d5db;
  --lab-text: #1c1c2e;
  --lab-text-secondary: #4b5563;
  --lab-text-muted: #6b7280;

  --lab-danger: #b91c1c;
  --lab-danger-bg: #fef2f2;
  --lab-danger-border: #fecaca;
  --lab-warning: #b45309;
  --lab-success: #2f6b12;
  --lab-success-bg: #eaf3de;
  --lab-recording: #ef4444;
  /* The recording bar stays dark on light pages, and turns amber near the limit in both themes. */
  --lab-bar-bg: #1c1c2e;
  --lab-bar-warning: #b45309;

  --lab-radius-md: 0.375rem;
  --lab-radius-lg: 0.5rem;
  --lab-radius-xl: 0.75rem;
  /* Kept for sites that override the old single radius. */
  --lab-radius: var(--lab-radius-md);
  --lab-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --lab-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --lab-ease: cubic-bezier(0.16, 1, 0.3, 1);

  font-family: var(--lab-font);
  font-size: 14px;
  line-height: 1.5;
  color: var(--lab-text);
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}

:host([data-theme='dark']), .lab-component-host[data-theme='dark'], .lab-component-wrapper[data-theme='dark'] {
${DARK_TOKENS}
}

@media (prefers-color-scheme: dark) {
  :host([data-theme='system']), .lab-component-host[data-theme='system'], .lab-component-wrapper[data-theme='system'] {
${DARK_TOKENS}
  }
}

*, *:before, *:after {
  box-sizing: border-box;
}

button, input, textarea {
  font-family: inherit;
}

:focus-visible {
  outline: 2px solid var(--lab-primary);
  outline-offset: 2px;
}

svg {
  flex-shrink: 0;
}

/* Floating "Get help" button, like the campus.codes Register button */
.lab-launcher {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: var(--lab-radius-lg);
  background: var(--lab-primary);
  color: var(--lab-on-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: var(--lab-shadow);
  transition: background-color 0.15s ease, transform 0.2s var(--lab-ease);
  z-index: 2147483640;
}

.lab-launcher:hover,
.lab-launcher.hover {
  background: var(--lab-primary-hover);
  transform: translateY(-1px);
}

.lab-launcher:focus-visible,
.lab-launcher.focus {
  outline: 2px solid var(--lab-primary);
  outline-offset: 2px;
}

.lab-launcher:active {
  transform: translateY(0);
}

.lab-launcher.hidden {
  display: none !important;
}

/* Recording bar at the top of the screen */
.lab-recording-bar {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 6px 6px 14px;
  border-radius: var(--lab-radius-xl);
  background: var(--lab-bar-bg);
  color: #ffffff;
  box-shadow: var(--lab-shadow);
  z-index: 2147483647;
  animation: slideDown 0.3s var(--lab-ease);
}

@keyframes slideDown {
  from { transform: translate(-50%, -100%); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}

.lab-recording-bar.hidden {
  display: none !important;
}

/* The last seconds before the recording limit */
.lab-recording-bar.warning {
  background: var(--lab-bar-warning);
  transition: background-color 0.3s var(--lab-ease);
}

.lab-rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--lab-recording);
  animation: pulseDot 1.2s ease-in-out infinite;
}

@keyframes pulseDot {
  50% { opacity: 0.35; }
}

.lab-rec-time {
  font-family: var(--lab-font-mono);
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.lab-bar-stop-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: var(--lab-radius-md);
  background: var(--lab-recording);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.lab-bar-stop-btn:hover {
  background: #dc2626;
}

/* Dimmed page behind the panel */
.lab-backdrop {
  position: fixed;
  inset: 0;
  background: rgb(28 28 46 / 0.35);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s var(--lab-ease);
  z-index: 2147483645;
}

.lab-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

/* Side panel */
.lab-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  background: var(--lab-bg);
  border-left: 1px solid var(--lab-border);
  box-shadow: var(--lab-shadow);
  transform: translateX(100%);
  transition: transform 0.35s var(--lab-ease);
  z-index: 2147483646;
}

.lab-sidebar.open {
  transform: translateX(0);
}

.lab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 12px 0 20px;
  border-bottom: 1px solid var(--lab-border);
}

.lab-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.lab-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--lab-radius-md);
  background: transparent;
  color: var(--lab-text-muted);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.lab-close-btn:hover {
  background: var(--lab-muted);
  color: var(--lab-text);
}

.lab-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  overflow-y: auto;
  background: var(--lab-surface);
}

/* Type switch with a sliding indicator */
.lab-type-selector {
  position: relative;
  display: flex;
  padding: 3px;
  border: 1px solid var(--lab-border);
  border-radius: var(--lab-radius-lg);
  background: var(--lab-muted);
  user-select: none;
}

.lab-type-indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc(33.333% - 2px);
  border-radius: var(--lab-radius-md);
  background: var(--lab-bg);
  box-shadow: var(--lab-shadow-sm);
  transition: transform 0.28s var(--lab-ease);
  z-index: 1;
  pointer-events: none;
}

.lab-type-btn {
  position: relative;
  z-index: 2;
  flex: 1;
  padding: 6px 8px;
  border: none;
  border-radius: var(--lab-radius-md);
  background: transparent;
  color: var(--lab-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;
}

.lab-type-btn:hover {
  color: var(--lab-text);
}

.lab-type-btn.active {
  color: var(--lab-primary);
}

/* Fields */
.lab-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lab-field label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--lab-text-muted);
}

.lab-input, .lab-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--lab-border);
  border-radius: var(--lab-radius-md);
  background: var(--lab-bg);
  color: var(--lab-text);
  font-size: 14px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.lab-input::placeholder, .lab-textarea::placeholder {
  color: var(--lab-text-muted);
}

.lab-input:focus, .lab-textarea:focus {
  outline: none;
  border-color: var(--lab-primary);
  box-shadow: 0 0 0 3px var(--lab-primary-soft);
}

.lab-textarea {
  min-height: 96px;
  resize: vertical;
}

/* Screenshot and recording buttons */
.lab-media-actions {
  display: flex;
  gap: 8px;
}

.lab-btn-outline {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--lab-border);
  border-radius: var(--lab-radius-md);
  background: var(--lab-bg);
  color: var(--lab-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.lab-btn-outline:hover:not(:disabled) {
  background: var(--lab-muted);
  border-color: var(--lab-border-strong);
}

.lab-btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Attached files, as rows of one card like the campus.codes tables */
.lab-attachments-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--lab-border);
  border-radius: var(--lab-radius-lg);
  background: var(--lab-bg);
  overflow: hidden;
}

.lab-attachments-list:empty {
  display: none;
}

.lab-attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 8px 8px 12px;
  border-bottom: 1px solid var(--lab-border);
  font-size: 13px;
  animation: attachFadeIn 0.25s var(--lab-ease);
}

.lab-attachment-item:last-child {
  border-bottom: none;
}

@keyframes attachFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.lab-attachment-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--lab-text);
}

.lab-attachment-name svg {
  color: var(--lab-text-muted);
}

.lab-btn-remove {
  height: 26px;
  padding: 0 8px;
  border: none;
  border-radius: var(--lab-radius-md);
  background: transparent;
  color: var(--lab-danger);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.lab-btn-remove:hover {
  background: var(--lab-danger-bg);
}

/* Upload error with Retry */
.lab-error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--lab-danger-border);
  border-radius: var(--lab-radius-lg);
  background: var(--lab-danger-bg);
  color: var(--lab-danger);
  font-size: 13px;
  line-height: 1.45;
  animation: attachFadeIn 0.25s var(--lab-ease);
}

.lab-error-icon {
  display: flex;
  margin-top: 1px;
}

.lab-error-banner.hidden {
  display: none !important;
}

/* Upload progress */
.lab-progress-container {
  display: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--lab-muted);
  overflow: hidden;
}

.lab-progress-container.active {
  display: block;
}

.lab-progress-bar {
  width: 0%;
  height: 100%;
  border-radius: 2px;
  background: var(--lab-primary);
  transition: width 0.3s ease;
}

/* Footer with Submit */
.lab-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--lab-border);
  background: var(--lab-bg);
}

.lab-submit-btn, .lab-btn-primary, .lab-btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border-radius: var(--lab-radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.lab-submit-btn, .lab-btn-primary {
  border: 1px solid var(--lab-primary);
  background: var(--lab-primary);
  color: var(--lab-on-primary);
}

.lab-submit-btn:hover:not(:disabled), .lab-btn-primary:hover {
  border-color: var(--lab-primary-hover);
  background: var(--lab-primary-hover);
}

.lab-submit-btn.retry-mode {
  border-color: var(--lab-danger);
  background: var(--lab-danger);
  color: var(--lab-bg);
}

.lab-submit-btn.retry-mode:hover:not(:disabled) {
  opacity: 0.9;
}

.lab-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lab-btn-secondary {
  border: 1px solid var(--lab-border);
  background: var(--lab-bg);
  color: var(--lab-text);
}

.lab-btn-secondary:hover {
  background: var(--lab-muted);
}

/* Success screen */
.lab-success-view {
  flex: 1;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  text-align: center;
  background: var(--lab-surface);
  animation: attachFadeIn 0.3s var(--lab-ease);
}

.lab-success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: 16px;
  border-radius: 50%;
  background: var(--lab-success-bg);
  color: var(--lab-success);
  animation: scaleSuccess 0.4s var(--lab-ease);
}

@keyframes scaleSuccess {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.lab-ref-badge {
  display: inline-block;
  max-width: 100%;
  margin: 14px 0 24px;
  padding: 6px 12px;
  border: 1px solid var(--lab-border);
  border-radius: var(--lab-radius-md);
  background: var(--lab-bg);
  color: var(--lab-text);
  font-family: var(--lab-font-mono);
  font-size: 13px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.lab-success-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}

.lab-success-actions > * {
  flex: 1;
}

@media (prefers-reduced-motion: reduce) {
  *, *:before, *:after {
    animation: none !important;
    transition: none !important;
  }
}
`;
