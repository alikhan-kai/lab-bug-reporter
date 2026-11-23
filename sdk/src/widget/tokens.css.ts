import { WIDGET_FONT_FAMILY, WIDGET_MONO_FONT_FAMILY } from './font';

// Used by theme: 'dark', and by theme: 'system' when the visitor's system is dark.
const DARK_TOKENS = `
  --lab-primary: #b4b6ff;
  --lab-primary-hover: #c9caff;
  --lab-primary-soft: #25253a;
  --lab-on-primary: #15153a;

  --lab-bg: #131311;
  --lab-surface: #1a1a17;
  --lab-muted: #0e0e0c;
  --lab-border: #2a2925;
  --lab-border-strong: #3a3934;
  --lab-text: #ece9e1;
  --lab-text-secondary: #ada89d;
  --lab-text-muted: #8f8a80;

  --lab-danger: #f0907a;
  --lab-danger-bg: #3a2420;
  --lab-success: #9cc98f;
  --lab-launcher: #ece9e1;
  --lab-on-launcher: #131311;

  --lab-shadow: 0 1px 2px rgb(0 0 0 / 0.4), 0 16px 40px -8px rgb(0 0 0 / 0.6);
  color-scheme: dark;
`;

/**
 * The widget's styles, inside its shadow root, so they never leak into the host site. The look matches the
 * dashboard: warm paper and graphite with one accent. A site sets the accent, button, corners and place through
 * the appearance option of init(), and can still override any --lab-* variable on #lab-reporter-root.
 */
export const widgetStyles = `
:host, .lab-component-host, .lab-component-wrapper {
  --lab-font: '${WIDGET_FONT_FAMILY}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --lab-font-mono: '${WIDGET_MONO_FONT_FAMILY}', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --lab-primary: #4447c9;
  --lab-primary-hover: #3639a8;
  --lab-primary-soft: #e6e5f6;
  --lab-on-primary: #ffffff;

  --lab-bg: #f4f2ed;
  --lab-surface: #fbfaf7;
  --lab-muted: #ece9e2;
  --lab-border: #e3dfd6;
  --lab-border-strong: #d3cec3;
  --lab-text: #1c1b18;
  --lab-text-secondary: #55514a;
  --lab-text-muted: #6b665d;

  --lab-danger: #b23a22;
  --lab-danger-bg: #f6e3dd;
  --lab-success: #3f6b3a;
  /* The open launcher and the recording bar are graphite in light pages and paper in dark ones. */
  --lab-launcher: #1c1b18;
  --lab-on-launcher: #f4f2ed;
  --lab-recording: #f0907a;
  --lab-warning: #e3b45c;

  --lab-radius-md: 8px;
  --lab-radius-lg: 10px;
  --lab-radius-xl: 16px;
  --lab-radius-launcher: 12px;
  /* Kept for sites that override the old single radius. */
  --lab-radius: var(--lab-radius-md);
  --lab-offset-x: 24px;
  --lab-offset-y: 24px;
  --lab-shadow: 0 1px 2px rgb(28 27 24 / 0.06), 0 12px 32px -8px rgb(28 27 24 / 0.18);
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
  color: inherit;
}

:focus-visible {
  outline: 2px solid var(--lab-primary);
  outline-offset: 2px;
}

svg {
  flex-shrink: 0;
}

.hidden {
  display: none !important;
}

.lab-mono {
  font-family: var(--lab-font-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/* The floating button: a pill by default, a circle, a tab on the edge, or nothing */
.lab-launcher {
  position: fixed;
  right: var(--lab-offset-x);
  bottom: var(--lab-offset-y);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 18px 0 14px;
  border: none;
  border-radius: var(--lab-radius-launcher);
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

.lab-launcher-close {
  display: none;
}

:host([data-position='bottom-left']) .lab-launcher {
  right: auto;
  left: var(--lab-offset-x);
}

:host([data-launcher='icon']) .lab-launcher {
  width: 52px;
  height: 52px;
  padding: 0;
}

:host([data-launcher='icon']) .lab-launcher-text {
  display: none;
}

/* While the form is open, the pill and the circle turn into its close button. */
:host(:not([data-launcher='tab'])) .lab-launcher.is-open {
  width: 48px;
  height: 48px;
  padding: 0;
  background: var(--lab-launcher);
  color: var(--lab-on-launcher);
}

:host(:not([data-launcher='tab'])) .lab-launcher.is-open .lab-launcher-mark,
:host(:not([data-launcher='tab'])) .lab-launcher.is-open .lab-launcher-text {
  display: none;
}

:host(:not([data-launcher='tab'])) .lab-launcher.is-open .lab-launcher-close {
  display: flex;
}

:host([data-launcher='tab']) .lab-launcher {
  top: 50%;
  bottom: auto;
  right: 0;
  width: 40px;
  height: auto;
  padding: 16px 0;
  border-radius: var(--lab-radius-launcher) 0 0 var(--lab-radius-launcher);
  writing-mode: vertical-rl;
  font-size: 13px;
  transform: translateY(-50%);
}

:host([data-launcher='tab']) .lab-launcher:hover {
  transform: translateY(-50%);
}

:host([data-launcher='tab'][data-position='bottom-left']) .lab-launcher {
  right: auto;
  left: 0;
  border-radius: 0 var(--lab-radius-launcher) var(--lab-radius-launcher) 0;
}

:host([data-launcher='none']) .lab-launcher {
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
  gap: 10px;
  height: 44px;
  padding: 0 6px 0 16px;
  border-radius: 999px;
  background: var(--lab-launcher);
  color: var(--lab-on-launcher);
  box-shadow: var(--lab-shadow);
  z-index: 2147483647;
  animation: slideDown 0.3s var(--lab-ease);
}

@keyframes slideDown {
  from { transform: translate(-50%, -100%); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}

/* The last seconds before the recording limit */
.lab-recording-bar.warning {
  background: var(--lab-warning);
  color: #1c1b18;
  transition: background-color 0.3s var(--lab-ease);
}

.lab-rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--lab-recording);
  box-shadow: 0 0 0 4px rgb(240 144 122 / 0.2);
  animation: pulseDot 1.2s ease-in-out infinite;
}

.lab-recording-bar.warning .lab-rec-dot {
  background: #1c1b18;
  box-shadow: none;
}

@keyframes pulseDot {
  50% { opacity: 0.35; }
}

.lab-rec-time {
  font-family: var(--lab-font-mono);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.lab-bar-stop-btn {
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: var(--lab-on-launcher);
  color: var(--lab-launcher);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.lab-recording-bar.warning .lab-bar-stop-btn {
  background: #1c1b18;
  color: #f4f2ed;
}

/* The form: a card that floats above the launcher, not a panel over the page */
.lab-panel {
  position: fixed;
  right: var(--lab-offset-x);
  bottom: calc(var(--lab-offset-y) + 64px);
  width: 380px;
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - var(--lab-offset-y) - 88px);
  display: flex;
  flex-direction: column;
  border-radius: var(--lab-radius-xl);
  background: var(--lab-bg);
  color: var(--lab-text);
  box-shadow: var(--lab-shadow), 0 0 0 1px var(--lab-border);
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px) scale(0.98);
  transform-origin: bottom right;
  transition: opacity 0.2s ease, transform 0.25s var(--lab-ease), visibility 0s linear 0.25s;
  z-index: 2147483646;
}

.lab-panel.open {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition: opacity 0.2s ease, transform 0.25s var(--lab-ease), visibility 0s;
}

:host([data-position='bottom-left']) .lab-panel {
  right: auto;
  left: var(--lab-offset-x);
  transform-origin: bottom left;
}

:host([data-launcher='tab']) .lab-panel,
:host([data-launcher='none']) .lab-panel {
  bottom: var(--lab-offset-y);
  max-height: calc(100vh - 2 * var(--lab-offset-y));
}

.lab-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 14px 4px 20px;
}

.lab-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.lab-subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--lab-text-muted);
}

.lab-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-top: -4px;
  padding: 0;
  border: none;
  border-radius: var(--lab-radius-md);
  background: transparent;
  color: var(--lab-text-muted);
  cursor: pointer;
}

.lab-close-btn:hover {
  background: var(--lab-muted);
  color: var(--lab-text);
}

.lab-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 20px 0;
  overflow-y: auto;
}

/* Type: three options on a sunken track */
.lab-type-selector {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2px;
  padding: 3px;
  border-radius: var(--lab-radius-lg);
  background: var(--lab-muted);
  user-select: none;
}

.lab-type-btn {
  height: 34px;
  padding: 0 6px;
  border: none;
  border-radius: var(--lab-radius-md);
  background: transparent;
  color: var(--lab-text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lab-type-btn:hover {
  color: var(--lab-text);
}

.lab-type-btn[aria-checked='true'] {
  background: var(--lab-surface);
  color: var(--lab-text);
  box-shadow: 0 0 0 1px var(--lab-border-strong);
}

/* Fields */
.lab-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lab-field label {
  font-size: 12px;
  font-weight: 500;
  color: var(--lab-text-secondary);
}

.lab-optional {
  font-weight: 400;
  color: var(--lab-text-muted);
}

.lab-input, .lab-textarea {
  width: 100%;
  padding: 0 12px;
  border: none;
  border-radius: var(--lab-radius-lg);
  background: var(--lab-surface);
  box-shadow: inset 0 0 0 1px var(--lab-border-strong);
  color: var(--lab-text);
  font-size: 14px;
  transition: box-shadow 0.15s ease;
}

.lab-input {
  height: 40px;
}

.lab-textarea {
  min-height: 80px;
  padding: 10px 12px;
  box-shadow: inset 0 0 0 1px var(--lab-border);
  resize: vertical;
}

.lab-input::placeholder, .lab-textarea::placeholder {
  color: var(--lab-text-muted);
}

.lab-input:focus, .lab-textarea:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--lab-primary), 0 0 0 3px var(--lab-primary-soft);
}

.lab-input[aria-invalid='true'] {
  box-shadow: inset 0 0 0 1px var(--lab-danger);
}

/* Screenshot and recording, as two tiles */
.lab-media-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.lab-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 10px 12px;
  border: none;
  border-radius: var(--lab-radius-xl);
  background: var(--lab-surface);
  box-shadow: inset 0 0 0 1px var(--lab-border);
  text-align: left;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
}

.lab-tile:hover:not(:disabled) {
  box-shadow: inset 0 0 0 1px var(--lab-text-muted);
}

.lab-tile:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lab-tile.is-recording {
  box-shadow: inset 0 0 0 1px var(--lab-recording);
}

.lab-tile-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}

.lab-tile-label {
  font-weight: 500;
}

.lab-tile-hint {
  color: var(--lab-text-muted);
}

/* Attached files, as small chips */
.lab-attachments-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.lab-attachments-list:empty {
  display: none;
}

.lab-attachment-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 4px 0 10px;
  border-radius: var(--lab-radius-md);
  background: var(--lab-muted);
  font-size: 12px;
  animation: attachFadeIn 0.25s var(--lab-ease);
}

@keyframes attachFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.lab-attachment-item .lab-mono {
  color: var(--lab-text-muted);
}

/* The recording to watch before sending, on its own line under the chips */
.lab-video-preview {
  flex-basis: 100%;
}

.lab-video-preview video {
  display: block;
  width: 100%;
  max-height: 160px;
  border-radius: var(--lab-radius-md);
  background: #000;
}

.lab-btn-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--lab-text-muted);
  cursor: pointer;
}

.lab-btn-remove:hover {
  background: var(--lab-border);
  color: var(--lab-danger);
}

/* What the SDK attaches by itself, said plainly */
.lab-context-note {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--lab-radius-lg);
  background: var(--lab-muted);
  font-family: var(--lab-font-mono);
  font-size: 11px;
  line-height: 1.6;
  color: var(--lab-text-secondary);
}

.lab-context-note span {
  display: block;
}

/* Upload error with Retry */
.lab-error-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--lab-radius-lg);
  background: var(--lab-danger-bg);
  color: var(--lab-danger);
  font-size: 13px;
  line-height: 1.45;
  animation: attachFadeIn 0.25s var(--lab-ease);
}

.lab-error-banner svg {
  margin-top: 2px;
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

/* Footer with Send */
.lab-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px 20px;
}

.lab-submit-btn, .lab-btn-primary, .lab-btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: var(--lab-radius-lg);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.lab-submit-btn, .lab-btn-primary {
  background: var(--lab-primary);
  color: var(--lab-on-primary);
}

.lab-submit-btn:hover:not(:disabled), .lab-btn-primary:hover {
  background: var(--lab-primary-hover);
}

.lab-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lab-btn-secondary {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--lab-border-strong);
  color: var(--lab-text);
}

.lab-btn-secondary:hover {
  background: var(--lab-muted);
}

/* The separate components of LabReporter.components, drawn in the same look as the widget */
.lab-btn-outline {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: var(--lab-radius-md);
  background: var(--lab-surface);
  box-shadow: inset 0 0 0 1px var(--lab-border);
  color: var(--lab-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
}

.lab-btn-outline:hover:not(:disabled) {
  box-shadow: inset 0 0 0 1px var(--lab-border-strong);
}

.lab-btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lab-type-btn.active {
  background: var(--lab-surface);
  color: var(--lab-text);
  box-shadow: 0 0 0 1px var(--lab-border-strong);
}

/* The new look marks the chosen type on the button itself, without a sliding indicator. */
.lab-type-indicator {
  display: none;
}

.lab-submit-btn.retry-mode {
  background: var(--lab-danger);
  color: var(--lab-bg);
}

/* Sent */
.lab-success-view {
  display: none;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 20px 20px;
  color: var(--lab-success);
  animation: attachFadeIn 0.3s var(--lab-ease);
}

.lab-success-view h3 {
  margin: 8px 0 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--lab-text);
}

.lab-success-view p {
  margin: 0;
  font-size: 13px;
  color: var(--lab-text-secondary);
}

.lab-ref {
  margin-top: 6px;
  color: var(--lab-text-muted);
  overflow-wrap: anywhere;
}

.lab-success-actions {
  display: flex;
  gap: 8px;
  width: 100%;
  margin-top: 12px;
}

.lab-success-actions > * {
  flex: 1;
}

/* On a phone the form becomes a sheet along the bottom edge. */
@media (max-width: 480px) {
  .lab-panel,
  :host([data-position='bottom-left']) .lab-panel,
  :host([data-launcher='tab']) .lab-panel,
  :host([data-launcher='none']) .lab-panel {
    left: 8px;
    right: 8px;
    bottom: 8px;
    width: auto;
    max-width: none;
    max-height: calc(100vh - 16px);
  }

  .lab-launcher.is-open {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *:before, *:after {
    animation: none !important;
    transition: none !important;
  }
}
`;
