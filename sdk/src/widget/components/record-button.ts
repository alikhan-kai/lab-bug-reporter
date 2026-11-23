import { icons } from '../icons';
import { widgetStyles } from '../tokens.css';

export type RecordButtonState = 'idle' | 'waiting_permission' | 'recording' | 'near_limit' | 'stopped';

export interface RecordButtonOptions {
  label?: string;
  state?: RecordButtonState;
  microphone?: boolean;
  maxSeconds?: number;
  warningSeconds?: number;
  onToggle?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  container?: HTMLElement;
  isolated?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Record button: Start/stop recording, mic toggle, timer, warning near limit per spec Section 9.
 * States: idle, waiting for permission, recording, near limit, stopped.
 */
export class RecordButton {
  public element: HTMLDivElement;
  private actionButton: HTMLButtonElement;
  private textSpan: HTMLSpanElement;
  private timerSpan: HTMLSpanElement;
  private dotEl: HTMLDivElement;
  private micToggleBtn: HTMLButtonElement;
  private state: RecordButtonState = 'idle';
  private microphone: boolean = true;
  private seconds: number = 0;
  private timerInterval: any = null;
  private options: RecordButtonOptions;

  constructor(options: RecordButtonOptions = {}) {
    this.options = options;
    this.microphone = options.microphone ?? true;

    this.element = document.createElement('div');
    this.element.className = 'lab-record-component';
    this.element.style.cssText = 'display: inline-flex; align-items: center; gap: 8px;';

    // Main action button
    this.actionButton = document.createElement('button');
    this.actionButton.className = 'lab-btn-outline';
    this.actionButton.type = 'button';

    this.dotEl = document.createElement('div');
    this.dotEl.className = 'lab-rec-dot';
    this.dotEl.style.display = 'none';

    this.timerSpan = document.createElement('span');
    this.timerSpan.className = 'lab-rec-time';
    this.timerSpan.style.cssText = 'font-family: var(--lab-font-mono, monospace); font-size: 12px; font-weight: 600; margin-left: 4px; display: none;';
    this.timerSpan.textContent = '0:00';

    this.textSpan = document.createElement('span');
    this.textSpan.textContent = options.label || 'Запись экрана';

    this.actionButton.appendChild(this.dotEl);
    this.actionButton.appendChild(this.textSpan);
    this.actionButton.appendChild(this.timerSpan);

    // Mic toggle pill button
    this.micToggleBtn = document.createElement('button');
    this.micToggleBtn.type = 'button';
    this.micToggleBtn.className = 'lab-btn-outline';
    this.micToggleBtn.style.cssText = 'padding: 6px 10px; font-size: 12px;';
    this.updateMicUi();

    this.micToggleBtn.addEventListener('click', () => {
      this.microphone = !this.microphone;
      this.updateMicUi();
    });

    this.actionButton.addEventListener('click', () => {
      if (options.onToggle) {
        options.onToggle();
      } else {
        if (this.state === 'idle' || this.state === 'stopped') {
          this.setState('recording');
          options.onStart?.();
        } else if (this.state === 'recording' || this.state === 'near_limit') {
          this.setState('stopped');
          options.onStop?.();
        }
      }
    });

    this.element.appendChild(this.actionButton);
    this.element.appendChild(this.micToggleBtn);

    if (options.state) {
      this.setState(options.state);
    } else {
      this.renderState('idle');
    }

    if (options.container) {
      this.mount(options.container, options.isolated, options.theme);
    }
  }

  isMicEnabled(): boolean {
    return this.microphone;
  }

  setMicEnabled(enabled: boolean): void {
    this.microphone = enabled;
    this.updateMicUi();
  }

  private updateMicUi(): void {
    this.micToggleBtn.innerHTML = this.microphone
      ? `🎙 Микрофон: ВКЛ`
      : `🔇 Микрофон: ВЫКЛ`;
    this.micToggleBtn.style.opacity = this.microphone ? '1' : '0.7';
  }

  setState(state: RecordButtonState, currentSeconds?: number): void {
    this.state = state;
    if (typeof currentSeconds === 'number') {
      this.seconds = currentSeconds;
    }
    this.renderState(state);
  }

  getState(): RecordButtonState {
    return this.state;
  }

  setTimerSeconds(sec: number): void {
    this.seconds = sec;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    this.timerSpan.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  private renderState(state: RecordButtonState): void {
    this.clearInterval();
    this.dotEl.style.display = 'none';
    this.timerSpan.style.display = 'none';
    this.actionButton.disabled = false;
    this.actionButton.style.borderColor = '';
    this.actionButton.style.color = '';
    this.actionButton.style.backgroundColor = '';

    if (state === 'idle') {
      this.actionButton.innerHTML = `${icons.video(16)}`;
      this.textSpan.textContent = this.options.label || 'Запись экрана';
      this.actionButton.appendChild(this.textSpan);
      this.micToggleBtn.style.display = 'inline-flex';
    } else if (state === 'waiting_permission') {
      this.actionButton.innerHTML = `<span style="animation: spin 1s linear infinite;">⏳</span>`;
      this.textSpan.textContent = 'Ожидание разрешения...';
      this.actionButton.appendChild(this.textSpan);
      this.actionButton.disabled = true;
    } else if (state === 'recording') {
      this.dotEl.style.display = 'inline-block';
      this.timerSpan.style.display = 'inline';
      this.actionButton.innerHTML = `${icons.stop(14)}`;
      this.textSpan.textContent = 'Остановить';
      this.actionButton.appendChild(this.dotEl);
      this.actionButton.appendChild(this.textSpan);
      this.actionButton.appendChild(this.timerSpan);
      this.setTimerSeconds(this.seconds || 14);
      this.actionButton.style.borderColor = 'var(--lab-recording, #ef4444)';
      this.actionButton.style.color = 'var(--lab-recording, #ef4444)';
      this.micToggleBtn.style.display = 'none';
    } else if (state === 'near_limit') {
      this.dotEl.style.display = 'inline-block';
      this.timerSpan.style.display = 'inline';
      this.actionButton.innerHTML = `${icons.stop(14)}`;
      this.textSpan.textContent = 'Лимит (5 мин)';
      this.actionButton.appendChild(this.dotEl);
      this.actionButton.appendChild(this.textSpan);
      this.actionButton.appendChild(this.timerSpan);
      this.setTimerSeconds(this.seconds || 288); // 4:48
      this.actionButton.style.borderColor = 'var(--lab-danger, #b91c1c)';
      this.actionButton.style.color = 'var(--lab-danger, #b91c1c)';
      this.actionButton.style.backgroundColor = 'var(--lab-danger-bg, #fef2f2)';
      this.micToggleBtn.style.display = 'none';
    } else if (state === 'stopped') {
      this.actionButton.innerHTML = `${icons.video(16)}`;
      this.textSpan.textContent = 'Записать заново';
      this.actionButton.appendChild(this.textSpan);
      this.micToggleBtn.style.display = 'inline-flex';
    }
  }

  private clearInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
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
