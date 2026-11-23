import { widgetStyles } from '../tokens.css';

export type ReportType = 'bug' | 'feature' | 'question';
export type TypeSelectorState = 'selected' | 'unselected' | 'focus';

export interface TypeSelectorOptions {
  initialType?: ReportType;
  labels?: { bug: string; feature: string; question: string };
  onChange?: (type: ReportType) => void;
  container?: HTMLElement;
  isolated?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Type selector: Bug / Feature idea / Question as segmented control per spec Section 9.
 * States: selected, unselected, focus.
 */
export class TypeSelector {
  public element: HTMLDivElement;
  private currentType: ReportType = 'bug';
  private buttons: Map<ReportType, HTMLButtonElement> = new Map();
  private indicator: HTMLDivElement;
  private onChangeCallback?: (type: ReportType) => void;

  constructor(options: TypeSelectorOptions = {}) {
    this.currentType = options.initialType || 'bug';
    this.onChangeCallback = options.onChange;

    const labels = options.labels || {
      bug: 'Баг',
      feature: 'Предложение',
      question: 'Вопрос'
    };

    this.element = document.createElement('div');
    this.element.className = 'lab-type-selector';

    this.indicator = document.createElement('div');
    this.indicator.className = 'lab-type-indicator';
    this.element.appendChild(this.indicator);

    const types: ReportType[] = ['bug', 'feature', 'question'];
    types.forEach((type, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `lab-type-btn${type === this.currentType ? ' active' : ''}`;
      btn.setAttribute('data-type', type);
      btn.setAttribute('data-index', String(index));
      btn.textContent = labels[type];

      btn.addEventListener('click', () => {
        this.setValue(type);
      });

      this.buttons.set(type, btn);
      this.element.appendChild(btn);
    });

    // Animate sliding indicator
    requestAnimationFrame(() => this.updateIndicator(false));

    if (options.container) {
      this.mount(options.container, options.isolated, options.theme);
    }
  }

  getValue(): ReportType {
    return this.currentType;
  }

  setValue(type: ReportType, triggerChange: boolean = true): void {
    this.currentType = type;
    this.buttons.forEach((btn, t) => {
      if (t === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.updateIndicator(true);

    if (triggerChange && this.onChangeCallback) {
      this.onChangeCallback(type);
    }
  }

  setState(state: TypeSelectorState, targetType?: ReportType): void {
    const type = targetType || this.currentType;
    if (state === 'selected') {
      this.setValue(type);
    } else if (state === 'unselected') {
      this.buttons.forEach(btn => btn.classList.remove('active'));
      this.indicator.style.opacity = '0';
    } else if (state === 'focus') {
      const btn = this.buttons.get(type);
      if (btn) btn.focus();
    }
  }

  private updateIndicator(animated: boolean): void {
    const activeBtn = this.buttons.get(this.currentType);
    if (!activeBtn) return;

    const idx = Number(activeBtn.getAttribute('data-index') || 0);
    this.indicator.style.opacity = '1';
    if (!animated) {
      this.indicator.style.transition = 'none';
    } else {
      this.indicator.style.transition = 'transform 0.28s var(--lab-ease, cubic-bezier(0.16, 1, 0.3, 1))';
    }

    this.indicator.style.transform = `translateX(calc(${idx} * (100% + 2px)))`;
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
    requestAnimationFrame(() => this.updateIndicator(false));
  }
}
