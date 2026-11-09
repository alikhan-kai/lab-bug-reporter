import { RingBuffer, Timestamped } from './ring-buffer';
import { truncateString } from './redact';

export interface ConsoleEntry extends Timestamped {
  t: number;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  stack?: string;
}

export class ConsoleCapture {
  private buffer: RingBuffer<ConsoleEntry>;
  private originalMethods: Record<string, Function> = {};
  private isInstalled = false;

  constructor(maxEntries: number = 500, maxAgeMs: number = 5 * 60 * 1000) {
    this.buffer = new RingBuffer<ConsoleEntry>(maxEntries, maxAgeMs);
  }

  install(): void {
    if (this.isInstalled || typeof window === 'undefined') return;

    const levels: Array<'log' | 'info' | 'warn' | 'error'> = ['log', 'info', 'warn', 'error'];

    for (const level of levels) {
      this.originalMethods[level] = console[level];

      console[level] = (...args: any[]) => {
        try {
          this.recordConsole(level, args);
        } catch {
          // Изоляция: ошибка внутри репортера никогда не должна ломать сайт
        }

        // Всегда вызываем оригинальный метод
        const original = this.originalMethods[level];
        if (original) {
          original.apply(console, args);
        }
      };
    }

    // Перехват необработанных ошибок window.onerror
    window.addEventListener('error', (event) => {
      try {
        const errorObj = event.error;
        this.buffer.add({
          timestamp: Date.now(),
          t: Date.now(),
          level: 'error',
          message: truncateString(event.message || 'Uncaught Error'),
          stack: errorObj?.stack ? truncateString(errorObj.stack) : undefined
        });
      } catch {}
    });

    // Перехват необработанных отклонений промисов
    window.addEventListener('unhandledrejection', (event) => {
      try {
        const reason = event.reason;
        const msg = typeof reason === 'string' ? reason : (reason?.message || 'Unhandled Promise Rejection');
        this.buffer.add({
          timestamp: Date.now(),
          t: Date.now(),
          level: 'error',
          message: truncateString(msg),
          stack: reason?.stack ? truncateString(reason.stack) : undefined
        });
      } catch {}
    });

    this.isInstalled = true;
  }

  private recordConsole(level: 'log' | 'info' | 'warn' | 'error', args: any[]): void {
    const formatted = args
      .map(arg => {
        if (arg instanceof Error) {
          return arg.stack || arg.message;
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg);
          } catch {
            return '[Circular Object]';
          }
        }
        return String(arg);
      })
      .join(' ');

    const entry: ConsoleEntry = {
      timestamp: Date.now(),
      t: Date.now(),
      level,
      message: truncateString(formatted)
    };

    if (level === 'error') {
      const err = args.find(a => a instanceof Error);
      if (err?.stack) {
        entry.stack = truncateString(err.stack);
      }
    }

    this.buffer.add(entry);
  }

  getEntries(): ConsoleEntry[] {
    return this.buffer.getAll();
  }
}
