import { RingBuffer, Timestamped } from './ring-buffer';
import { sanitizeHeaders, sanitizeBody } from './redact';

export interface NetworkEntry extends Timestamped {
  t_start: number;
  duration_ms: number;
  method: string;
  url: string;
  status: number;
  initiator: 'fetch' | 'xhr';
  request?: {
    headers: Record<string, string>;
    body: string;
    body_truncated: boolean;
  };
  response?: {
    headers: Record<string, string>;
    body: string;
    body_truncated: boolean;
  };
  error?: string | null;
}

export class NetworkCapture {
  private buffer: RingBuffer<NetworkEntry>;
  private isInstalled = false;
  private ingestEndpoint = '/api/ingest/reports';

  constructor(maxEntries: number = 200, maxAgeMs: number = 5 * 60 * 1000) {
    this.buffer = new RingBuffer<NetworkEntry>(maxEntries, maxAgeMs);
  }

  setIngestEndpoint(endpoint: string): void {
    this.ingestEndpoint = endpoint;
  }

  install(): void {
    if (this.isInstalled || typeof window === 'undefined') return;

    this.installFetch();
    this.installXhr();
    this.isInstalled = true;
  }

  private installFetch(): void {
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
      const input = args[0];
      const init = args[1];

      let url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input && typeof (input as Request).url === 'string') {
        url = (input as Request).url;
      }

      // Не перехватываем собственный запрос отправки отчета
      if (url.includes(self.ingestEndpoint)) {
        return originalFetch.apply(window, args);
      }

      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const startTime = Date.now();

      // Санитизируем заголовки и тело запроса
      const reqHeaders = sanitizeHeaders(init?.headers || (input instanceof Request ? input.headers : undefined));
      let reqBodyStr = '';
      if (typeof init?.body === 'string') {
        reqBodyStr = init.body;
      }
      const sanitizedReqBody = sanitizeBody(reqBodyStr);

      try {
        const response = await originalFetch.apply(window, args);

        // КЛОНИРУЕМ ответ, чтобы основной сайт мог прочитать свой поток!
        const clone = response.clone();
        const duration = Date.now() - startTime;

        const resHeaders = sanitizeHeaders(response.headers);

        // Читаем тело асинхронно
        clone.text()
          .then(bodyText => {
            const sanitizedResBody = sanitizeBody(bodyText);
            self.buffer.add({
              timestamp: startTime,
              t_start: startTime,
              duration_ms: duration,
              method,
              url,
              status: response.status,
              initiator: 'fetch',
              request: {
                headers: reqHeaders,
                body: sanitizedReqBody.body,
                body_truncated: sanitizedReqBody.truncated
              },
              response: {
                headers: resHeaders,
                body: sanitizedResBody.body,
                body_truncated: sanitizedResBody.truncated
              },
              error: null
            });
          })
          .catch(() => {
            // Бинарные ответы (картинки, файлы) не парсим как текст
            self.buffer.add({
              timestamp: startTime,
              t_start: startTime,
              duration_ms: duration,
              method,
              url,
              status: response.status,
              initiator: 'fetch',
              request: {
                headers: reqHeaders,
                body: sanitizedReqBody.body,
                body_truncated: sanitizedReqBody.truncated
              },
              response: {
                headers: resHeaders,
                body: '[Binary data]',
                body_truncated: false
              },
              error: null
            });
          });

        return response;
      } catch (err: any) {
        // Ошибка сети, CORS или timeout
        self.buffer.add({
          timestamp: startTime,
          t_start: startTime,
          duration_ms: Date.now() - startTime,
          method,
          url,
          status: 0,
          initiator: 'fetch',
          request: {
            headers: reqHeaders,
            body: sanitizedReqBody.body,
            body_truncated: sanitizedReqBody.truncated
          },
          error: err?.message || 'Network request failed'
        });
        throw err;
      }
    };
  }

  private installXhr(): void {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    const self = this;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
      (this as any).__lab_network = {
        method: method.toUpperCase(),
        url: url.toString(),
        requestHeaders: {}
      };
      return originalOpen.apply(this, [method, url, ...rest] as any);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (header: string, value: string) {
      if ((this as any).__lab_network) {
        (this as any).__lab_network.requestHeaders[header] = value;
      }
      return originalSetRequestHeader.apply(this, [header, value]);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const meta = (this as any).__lab_network;
      if (!meta || meta.url.includes(self.ingestEndpoint)) {
        return originalSend.apply(this, arguments as any);
      }

      const startTime = Date.now();
      const sanitizedReqHeaders = sanitizeHeaders(meta.requestHeaders);
      const sanitizedReqBody = sanitizeBody(typeof body === 'string' ? body : undefined);

      this.addEventListener('loadend', () => {
        try {
          const duration = Date.now() - startTime;
          let resText = '';
          try {
            resText = this.responseText;
          } catch {}

          const sanitizedResBody = sanitizeBody(resText);

          self.buffer.add({
            timestamp: startTime,
            t_start: startTime,
            duration_ms: duration,
            method: meta.method,
            url: meta.url,
            status: this.status,
            initiator: 'xhr',
            request: {
              headers: sanitizedReqHeaders,
              body: sanitizedReqBody.body,
              body_truncated: sanitizedReqBody.truncated
            },
            response: {
              headers: {},
              body: sanitizedResBody.body,
              body_truncated: sanitizedResBody.truncated
            },
            error: this.status === 0 ? 'Network/CORS error' : null
          });
        } catch {}
      });

      return originalSend.apply(this, arguments as any);
    };
  }

  getEntries(): NetworkEntry[] {
    return this.buffer.getAll();
  }
}
