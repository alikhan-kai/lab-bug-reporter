import { icons } from '../icons';
import { widgetStyles } from '../tokens.css';

export type ScreenshotButtonState = 'idle' | 'capturing' | 'done';

export interface ScreenshotButtonOptions {
  label?: string;
  state?: ScreenshotButtonState;
  onClick?: () => Promise<Blob | void> | void;
  onCapture?: (blob: Blob) => void;
  container?: HTMLElement;
  isolated?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Screenshot button: Captures page and adds a thumbnail per spec Section 9.
 * States: idle, capturing, done.
 */
export class ScreenshotButton {
  public element: HTMLButtonElement;
  private state: ScreenshotButtonState = 'idle';
  private labelText: string;
  private textSpan: HTMLSpanElement;
  private onCaptureCallback?: (blob: Blob) => void;

  constructor(options: ScreenshotButtonOptions = {}) {
    this.labelText = options.label || 'Скриншот';
    this.onCaptureCallback = options.onCapture;

    this.element = document.createElement('button');
    this.element.className = 'lab-btn-outline';
    this.element.type = 'button';

    this.textSpan = document.createElement('span');
    this.renderState('idle');

    this.element.addEventListener('click', async () => {
      if (this.state === 'capturing') return;
      if (options.onClick) {
        this.setState('capturing');
        try {
          const res = await options.onClick();
          this.setState('done');
          if (res instanceof Blob) {
            this.onCaptureCallback?.(res);
          }
        } catch (e) {
          this.setState('idle');
        }
      }
    });

    if (options.state) {
      this.setState(options.state);
    }

    if (options.container) {
      this.mount(options.container, options.isolated, options.theme);
    }
  }

  setState(state: ScreenshotButtonState): void {
    this.state = state;
    this.renderState(state);
  }

  getState(): ScreenshotButtonState {
    return this.state;
  }

  private renderState(state: ScreenshotButtonState): void {
    this.element.disabled = state === 'capturing';
    if (state === 'idle') {
      this.element.innerHTML = `${icons.camera(16)}`;
      this.textSpan.textContent = this.labelText;
      this.element.appendChild(this.textSpan);
    } else if (state === 'capturing') {
      this.element.innerHTML = `<span class="lab-spinner" style="display:inline-block; animation: spin 1s linear infinite;">⏳</span>`;
      this.textSpan.textContent = 'Снимок...';
      this.element.appendChild(this.textSpan);
    } else if (state === 'done') {
      this.element.innerHTML = `${icons.check(16)}`;
      this.textSpan.textContent = 'Снято ✓';
      this.element.appendChild(this.textSpan);
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
