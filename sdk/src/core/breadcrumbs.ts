import { RingBuffer, Timestamped } from './ring-buffer';

export interface BreadcrumbEntry extends Timestamped {
  t: number;
  kind: 'click' | 'navigation' | 'focus';
  target?: string;
  text?: string;
  url?: string;
}

export class BreadcrumbsCapture {
  private buffer: RingBuffer<BreadcrumbEntry>;
  private isInstalled = false;

  constructor(maxEntries: number = 100) {
    this.buffer = new RingBuffer<BreadcrumbEntry>(maxEntries);
  }

  install(): void {
    if (this.isInstalled || typeof window === 'undefined') return;

    // 1. Клики пользователя (без сбора приватных данных)
    document.addEventListener('click', (event) => {
      try {
        const target = event.target as HTMLElement | null;
        if (!target) return;

        // Не отслеживаем клики внутри самого виджета репортера
        if (target.closest && target.closest('#lab-reporter-root')) return;

        const tag = target.tagName.toLowerCase();
        const id = target.id ? `#${target.id}` : '';
        const className = typeof target.className === 'string' && target.className
          ? `.${target.className.trim().split(/\s+/).slice(0, 2).join('.')}`
          : '';

        let text = (target.innerText || target.textContent || '').trim();
        // Если это поле пароля или секретное поле — текст не берем
        if (target instanceof HTMLInputElement && target.type === 'password') {
          text = '';
        }

        this.buffer.add({
          timestamp: Date.now(),
          t: Date.now(),
          kind: 'click',
          target: `${tag}${id}${className}`,
          text: text ? text.slice(0, 30) : undefined
        });
      } catch {}
    }, true);

    // 2. Перемещение фокуса (пользователь встал в поле, но мы НЕ читаем, что он пишет!)
    document.addEventListener('focusin', (event) => {
      try {
        const target = event.target as HTMLElement | null;
        if (!target || !target.tagName) return;
        const tag = target.tagName.toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag)) {
          this.buffer.add({
            timestamp: Date.now(),
            t: Date.now(),
            kind: 'focus',
            target: `${tag}${target.id ? `#${target.id}` : ''}`
          });
        }
      } catch {}
    }, true);

    // 3. Навигация и смена URL
    window.addEventListener('popstate', () => {
      this.recordNavigation(window.location.href);
    });
    window.addEventListener('hashchange', () => {
      this.recordNavigation(window.location.href);
    });

    this.isInstalled = true;
  }

  private recordNavigation(url: string): void {
    this.buffer.add({
      timestamp: Date.now(),
      t: Date.now(),
      kind: 'navigation',
      url
    });
  }

  getEntries(): BreadcrumbEntry[] {
    return this.buffer.getAll();
  }
}
