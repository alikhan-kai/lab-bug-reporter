import { icons } from '../icons';
import { widgetStyles } from '../tokens.css';

export type SubmitBarState = 'idle' | 'uploading' | 'success' | 'error';

export interface SubmitBarOptions {
  submitLabel?: string;
  retryLabel?: string;
  state?: SubmitBarState;
  progressPercent?: number;
  referenceNumber?: string;
  errorMessage?: string;
  onSubmit?: () => void;
  onRetry?: () => void;
  container?: HTMLElement;
  isolated?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Submit bar: Submit button, upload progress, success with ref number, or error with Retry.
 * States: idle, uploading, success, error.
 */
export class SubmitBar {
  public element: HTMLDivElement;
  private progressContainer: HTMLDivElement;
  private progressBar: HTMLDivElement;
  private submitButton: HTMLButtonElement;
  private textSpan: HTMLSpanElement;
  private errorBanner: HTMLDivElement;
  private errorText: HTMLSpanElement;
  private successBanner: HTMLDivElement;
  private refNumberEl: HTMLElement;

  private state: SubmitBarState = 'idle';
  private submitLabel: string;
  private retryLabel: string;
  private onSubmitCallback?: () => void;
  private onRetryCallback?: () => void;

  constructor(options: SubmitBarOptions = {}) {
    this.submitLabel = options.submitLabel || 'Отправить отчёт';
    this.retryLabel = options.retryLabel || 'Повторить отправку (Retry)';
    this.onSubmitCallback = options.onSubmit;
    this.onRetryCallback = options.onRetry;

    this.element = document.createElement('div');
    this.element.className = 'lab-submit-bar-container';

    // Error banner (inline, replaces alert)
    this.errorBanner = document.createElement('div');
    this.errorBanner.className = 'lab-error-banner hidden';
    this.errorBanner.innerHTML = `${icons.alert(16)}`;
    this.errorText = document.createElement('span');
    this.errorText.textContent = options.errorMessage || 'Не удалось отправить отчёт. Пожалуйста, попробуйте снова.';
    this.errorBanner.appendChild(this.errorText);
    this.element.appendChild(this.errorBanner);

    // Success banner with reference number
    this.successBanner = document.createElement('div');
    this.successBanner.className = 'lab-success-mini hidden';
    this.successBanner.style.cssText = 'text-align: center; padding: 12px; background: var(--lab-success-bg, #eaf3de); border-radius: var(--lab-radius-md, 6px); margin-bottom: 8px;';
    this.successBanner.innerHTML = `<div style="color: var(--lab-success, #2f6b12); font-weight: 700; font-size: 14px; margin-bottom: 4px;">✓ Отчёт успешно отправлен!</div>`;
    this.refNumberEl = document.createElement('div');
    this.refNumberEl.style.cssText = 'font-family: var(--lab-font-mono, monospace); font-size: 12px; color: var(--lab-text-secondary, #4b5563);';
    this.refNumberEl.textContent = options.referenceNumber || 'REF-84920';
    this.successBanner.appendChild(this.refNumberEl);
    this.element.appendChild(this.successBanner);

    // Footer with progress & button
    const footer = document.createElement('div');
    footer.className = 'lab-footer';

    this.progressContainer = document.createElement('div');
    this.progressContainer.className = 'lab-progress-container';
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'lab-progress-bar';
    this.progressContainer.appendChild(this.progressBar);
    footer.appendChild(this.progressContainer);

    this.submitButton = document.createElement('button');
    this.submitButton.className = 'lab-submit-btn';
    this.submitButton.type = 'button';
    this.textSpan = document.createElement('span');
    this.textSpan.textContent = this.submitLabel;
    this.submitButton.appendChild(this.textSpan);

    this.submitButton.addEventListener('click', () => {
      if (this.state === 'uploading') return;
      if (this.state === 'error') {
        if (this.onRetryCallback) {
          this.onRetryCallback();
        } else if (this.onSubmitCallback) {
          this.onSubmitCallback();
        }
      } else if (this.state === 'idle') {
        this.onSubmitCallback?.();
      }
    });

    footer.appendChild(this.submitButton);
    this.element.appendChild(footer);

    if (options.state) {
      this.setState(options.state, {
        progress: options.progressPercent,
        refNumber: options.referenceNumber,
        error: options.errorMessage
      });
    } else {
      this.renderState('idle');
    }

    if (options.container) {
      this.mount(options.container, options.isolated, options.theme);
    }
  }

  setState(
    state: SubmitBarState,
    payload?: { progress?: number; refNumber?: string; error?: string }
  ): void {
    this.state = state;
    if (payload?.refNumber) {
      this.refNumberEl.textContent = payload.refNumber;
    }
    if (payload?.error) {
      this.errorText.textContent = payload.error;
    }
    this.renderState(state, payload?.progress);
  }

  setProgress(percent: number): void {
    this.progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    this.textSpan.textContent = `Отправка данных (${Math.round(percent)}%)...`;
  }

  private renderState(state: SubmitBarState, progress?: number): void {
    this.errorBanner.classList.add('hidden');
    this.successBanner.classList.add('hidden');
    this.progressContainer.classList.remove('active');
    this.submitButton.classList.remove('retry-mode');
    this.submitButton.disabled = false;
    this.submitButton.style.display = 'block';

    if (state === 'idle') {
      this.textSpan.textContent = this.submitLabel;
    } else if (state === 'uploading') {
      this.progressContainer.classList.add('active');
      this.submitButton.disabled = true;
      this.setProgress(progress ?? 45);
    } else if (state === 'success') {
      this.submitButton.style.display = 'none';
      this.successBanner.classList.remove('hidden');
    } else if (state === 'error') {
      this.errorBanner.classList.remove('hidden');
      this.submitButton.classList.add('retry-mode');
      this.textSpan.textContent = this.retryLabel;
    }
  }

  getState(): SubmitBarState {
    return this.state;
  }

  mount(target: HTMLElement, isolated: boolean = false, theme: 'light' | 'dark' | 'system' = 'light'): void {
    if (isolated) {
      const host = document.createElement('div');
      host.className = 'lab-component-host';
      host.setAttribute('data-theme', theme);
      const shadow = host.attachShadow({ mode: 'open' });
      const styleEl = document.createElement('style');
      styleEl.textContent = widgetStyles;
      shadow.appendChild(styleEl);
      shadow.appendChild(this.element);
      target.appendChild(host);
    } else {
      target.appendChild(this.element);
    }
  }
}
