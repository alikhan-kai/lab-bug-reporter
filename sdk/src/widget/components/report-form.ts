import { widgetStyles } from '../tokens.css';

export type ReportFormState = 'empty' | 'filled' | 'validation_error';

export interface ReportFormOptions {
  title?: string;
  description?: string;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  titleLabel?: string;
  descriptionLabel?: string;
  state?: ReportFormState;
  onInput?: () => void;
  container?: HTMLElement;
  isolated?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Report form: Title (required) and description per spec Section 9.
 * States: empty, filled, validation error.
 */
export class ReportForm {
  public element: HTMLDivElement;
  public titleInput: HTMLInputElement;
  public descInput: HTMLTextAreaElement;
  private errorHint: HTMLDivElement;
  private state: ReportFormState = 'empty';

  constructor(options: ReportFormOptions = {}) {
    this.element = document.createElement('div');
    this.element.className = 'lab-form-container';

    // Title field
    const titleField = document.createElement('div');
    titleField.className = 'lab-field';

    const titleLabel = document.createElement('label');
    titleLabel.textContent = options.titleLabel || 'Что пошло не так?';
    titleField.appendChild(titleLabel);

    this.titleInput = document.createElement('input');
    this.titleInput.type = 'text';
    this.titleInput.className = 'lab-input';
    this.titleInput.placeholder = options.titlePlaceholder || 'Кратко опишите проблему...';
    this.titleInput.value = options.title || '';
    titleField.appendChild(this.titleInput);

    this.errorHint = document.createElement('div');
    this.errorHint.className = 'lab-error-hint';
    this.errorHint.style.cssText = 'color: var(--lab-danger, #b91c1c); font-size: 11px; margin-top: 4px; display: none;';
    this.errorHint.textContent = 'Пожалуйста, укажите заголовок отчёта';
    titleField.appendChild(this.errorHint);

    this.element.appendChild(titleField);

    // Description field
    const descField = document.createElement('div');
    descField.className = 'lab-field';

    const descLabel = document.createElement('label');
    descLabel.textContent = options.descriptionLabel || 'Подробности (необязательно)';
    descField.appendChild(descLabel);

    this.descInput = document.createElement('textarea');
    this.descInput.className = 'lab-textarea';
    this.descInput.placeholder = options.descriptionPlaceholder || 'Что вы делали, что ожидали и что произошло...';
    this.descInput.value = options.description || '';
    descField.appendChild(this.descInput);

    this.element.appendChild(descField);

    this.titleInput.addEventListener('input', () => {
      this.clearError();
      options.onInput?.();
    });
    this.descInput.addEventListener('input', () => {
      options.onInput?.();
    });

    if (options.state) {
      this.setState(options.state);
    }

    if (options.container) {
      this.mount(options.container, options.isolated, options.theme);
    }
  }

  getTitle(): string {
    return this.titleInput.value.trim();
  }

  getDescription(): string {
    return this.descInput.value.trim();
  }

  validate(): boolean {
    if (!this.getTitle()) {
      this.setState('validation_error');
      return false;
    }
    this.clearError();
    return true;
  }

  clearError(): void {
    this.titleInput.style.borderColor = '';
    this.titleInput.style.boxShadow = '';
    this.errorHint.style.display = 'none';
    if (this.state === 'validation_error') {
      this.state = this.getTitle() ? 'filled' : 'empty';
    }
  }

  setState(state: ReportFormState): void {
    this.state = state;
    if (state === 'empty') {
      this.titleInput.value = '';
      this.descInput.value = '';
      this.clearError();
    } else if (state === 'filled') {
      if (!this.titleInput.value) {
        this.titleInput.value = 'Кнопка оплаты не реагирует на нажатие';
      }
      if (!this.descInput.value) {
        this.descInput.value = 'При нажатии на Оплатить Kaspi в консоли появляется ошибка 500.';
      }
      this.clearError();
    } else if (state === 'validation_error') {
      this.titleInput.value = '';
      this.titleInput.style.borderColor = 'var(--lab-danger, #b91c1c)';
      this.titleInput.style.boxShadow = '0 0 0 3px var(--lab-danger-bg, #fef2f2)';
      this.errorHint.style.display = 'block';
      this.titleInput.focus();
    }
  }

  getState(): ReportFormState {
    return this.state;
  }

  reset(): void {
    this.setState('empty');
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
