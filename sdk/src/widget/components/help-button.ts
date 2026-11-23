import { icons } from '../icons';
import { widgetStyles } from '../tokens.css';

export type HelpButtonState = 'default' | 'hover' | 'focus' | 'hidden';

export interface HelpButtonOptions {
  state?: HelpButtonState;
  label?: string;
  position?: { bottom?: string; right?: string; top?: string; left?: string };
  onClick?: (event: MouseEvent) => void;
  container?: HTMLElement;
  isolated?: boolean; // if true, mounts into its own Shadow DOM
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Help button: Floating launcher per spec Section 9.
 * States: default, hover, focus, hidden.
 */
export class HelpButton {
  public element: HTMLButtonElement;
  private state: HelpButtonState = 'default';
  private labelSpan: HTMLSpanElement;

  constructor(options: HelpButtonOptions = {}) {
    this.element = document.createElement('button');
    this.element.className = 'lab-launcher';
    this.element.type = 'button';
    this.element.setAttribute('aria-label', options.label || 'Get help');

    this.element.innerHTML = `${icons.help(16)}`;
    this.labelSpan = document.createElement('span');
    this.labelSpan.textContent = options.label || 'Помощь';
    this.element.appendChild(this.labelSpan);

    if (options.position) {
      if (options.position.bottom) this.element.style.bottom = options.position.bottom;
      if (options.position.right) this.element.style.right = options.position.right;
      if (options.position.top) this.element.style.top = options.position.top;
      if (options.position.left) this.element.style.left = options.position.left;
    } else if (options.container) {
      this.element.style.position = 'relative';
      this.element.style.bottom = 'auto';
      this.element.style.right = 'auto';
    }

    if (options.onClick) {
      this.element.addEventListener('click', options.onClick);
    }

    if (options.state) {
      this.setState(options.state);
    }

    if (options.container) {
      this.mount(options.container, options.isolated, options.theme);
    }
  }

  setLabel(label: string): void {
    this.labelSpan.textContent = label;
    this.element.setAttribute('aria-label', label);
  }

  setState(state: HelpButtonState): void {
    this.state = state;
    this.element.classList.remove('hidden', 'hover', 'focus');

    if (state === 'hidden') {
      this.element.classList.add('hidden');
    } else if (state === 'hover') {
      this.element.classList.add('hover');
    } else if (state === 'focus') {
      this.element.classList.add('focus');
      this.element.focus();
    }
  }

  getState(): HelpButtonState {
    return this.state;
  }

  show(): void {
    this.setState('default');
  }

  hide(): void {
    this.setState('hidden');
  }

  mount(target: HTMLElement, isolated: boolean = false, theme: 'light' | 'dark' | 'system' = 'light'): void {
    if (!this.element.style.position || this.element.style.position === 'fixed') {
      this.element.style.position = 'relative';
      this.element.style.bottom = 'auto';
      this.element.style.right = 'auto';
    }
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
