import { RingBuffer, Timestamped } from './ring-buffer';
import { sanitizeHeaders, sanitizeBody } from './redact';

export interface NetworkEntry extends Timestamped {
  t_start: number;
  duration_ms: number | null;
  method: string;
  url: string;
  status: number | null; // null/empty для упавших и зависших запросов (по ТЗ раздел 7)
  initiator: 'fetch' | 'xhr';
  pending?: boolean;     // флаг для зависших запросов
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
  error?: string | null; // заполнено при ошибке
}

export class NetworkCapture {
  private buffer: RingBuffer<NetworkEntry>;
  private isInstalled = false;
  private ingestEndpoint = '/api/v1/ingest/';

  // Хранилище активных (в процессе / зависших) запросов
  private inFlightRequests: Map<string, NetworkEntry> = new Map();
  private reqCounter = 0;

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
      let capture: ReturnType<typeof self.startFetchCapture>;
      try {
        capture = self.startFetchCapture(args);
      } catch {
        // The log misses this request, but the site still gets its answer.
        capture = null;
      }
      if (!capture) {
        return originalFetch.apply(window, args);
      }
      const { reqId, method, url, startTime, reqHeaders, sanitizedReqBody } = capture;

      let response: Response;
      try {
        response = await originalFetch.apply(window, args);
      } catch (err: any) {
        // Упавший запрос: статус ОБЯЗАН быть null (empty), а error заполнен (ТЗ раздел 8)
        self.inFlightRequests.delete(reqId);
        self.buffer.add({
          timestamp: startTime,
          t_start: startTime,
          duration_ms: Date.now() - startTime,
          method,
          url,
          status: null, // пустой статус
          initiator: 'fetch',
          pending: false,
          request: {
            headers: reqHeaders,
            body: sanitizedReqBody.body,
            body_truncated: sanitizedReqBody.truncated
          },
          error: err?.message || 'Network request failed (network error, CORS block or timeout)'
        });
        throw err;
      }

      // Only the site's own failure goes back to the site; a failure while logging the answer stays here.
      try {
        // Клонируем ответ, чтобы сайт не сломался
        const clone = response.clone();
        const duration = Date.now() - startTime;
        const resHeaders = sanitizeHeaders(response.headers);

        clone.text()
          .then(bodyText => {
            const sanitizedResBody = sanitizeBody(bodyText);
            self.inFlightRequests.delete(reqId);
            self.buffer.add({
              timestamp: startTime,
              t_start: startTime,
              duration_ms: duration,
              method,
              url,
              status: response.status,
              initiator: 'fetch',
              pending: false,
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
            self.inFlightRequests.delete(reqId);
            self.buffer.add({
              timestamp: startTime,
              t_start: startTime,
              duration_ms: duration,
              method,
              url,
              status: response.status,
              initiator: 'fetch',
              pending: false,
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
      } catch {
        // Logging the answer failed, so the request is left out of the log rather than shown as pending.
        self.inFlightRequests.delete(reqId);
      }
      return response;
    };
  }

  /** Reads a fetch call for the log and marks it pending. Returns null for the SDK's own upload. */
  private startFetchCapture(args: Parameters<typeof fetch>) {
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
    if (url.includes(this.ingestEndpoint)) {
      return null;
    }

    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const startTime = Date.now();
    const reqId = `fetch_${++this.reqCounter}_${startTime}`;

    // Санитизируем заголовки и тело запроса
    const reqHeaders = sanitizeHeaders(init?.headers || (input instanceof Request ? input.headers : undefined));
    const sanitizedReqBody = sanitizeBody(typeof init?.body === 'string' ? init.body : '');

    // Фиксируем запрос сразу как активный (для отслеживания зависших запросов)
    this.inFlightRequests.set(reqId, {
      timestamp: startTime,
      t_start: startTime,
      duration_ms: null,
      method,
      url,
      status: null, // пустой статус для незавершенных
      initiator: 'fetch',
      pending: true,
      request: {
        headers: reqHeaders,
        body: sanitizedReqBody.body,
        body_truncated: sanitizedReqBody.truncated
      },
      error: null
    });
    return { reqId, method, url, startTime, reqHeaders, sanitizedReqBody };
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
      const reqId = `xhr_${++self.reqCounter}_${startTime}`;
      let sanitizedReqHeaders: Record<string, string>;
      let sanitizedReqBody: ReturnType<typeof sanitizeBody>;
      try {
        sanitizedReqHeaders = sanitizeHeaders(meta.requestHeaders);
        sanitizedReqBody = sanitizeBody(typeof body === 'string' ? body : undefined);
      } catch {
        // The log misses this request, but the site's request still goes out.
        return originalSend.apply(this, arguments as any);
      }

      // Записываем сразу как pending
      const pendingEntry: NetworkEntry = {
        timestamp: startTime,
        t_start: startTime,
        duration_ms: null,
        method: meta.method,
        url: meta.url,
        status: null,
        initiator: 'xhr',
        pending: true,
        request: {
          headers: sanitizedReqHeaders,
          body: sanitizedReqBody.body,
          body_truncated: sanitizedReqBody.truncated
        },
        error: null
      };
      self.inFlightRequests.set(reqId, pendingEntry);

      this.addEventListener('loadend', () => {
        try {
          self.inFlightRequests.delete(reqId);
          const duration = Date.now() - startTime;
          let resText = '';
          try {
            resText = this.responseText;
          } catch {}

          const sanitizedResBody = sanitizeBody(resText);
          const isFailed = this.status === 0;

          self.buffer.add({
            timestamp: startTime,
            t_start: startTime,
            duration_ms: duration,
            method: meta.method,
            url: meta.url,
            // Если статус 0 (ошибка сети/CORS) — статус null по ТЗ
            status: isFailed ? null : this.status,
            initiator: 'xhr',
            pending: false,
            request: {
              headers: sanitizedReqHeaders,
              body: sanitizedReqBody.body,
              body_truncated: sanitizedReqBody.truncated
            },
            response: isFailed ? undefined : {
              headers: sanitizeHeaders(parseResponseHeaders(this.getAllResponseHeaders())),
              body: sanitizedResBody.body,
              body_truncated: sanitizedResBody.truncated
            },
            error: isFailed ? 'Network error / CORS block' : null
          });
        } catch {}
      });

      return originalSend.apply(this, arguments as any);
    };
  }

  /**
   * Возвращает все завершенные запросы И все зависшие на текущий момент запросы
   */
  getEntries(): NetworkEntry[] {
    const finished = this.buffer.getAll();
    const now = Date.now();

    // Зависшие запросы на текущий момент
    const hanging: NetworkEntry[] = Array.from(this.inFlightRequests.values()).map(entry => ({
      ...entry,
      duration_ms: now - entry.t_start
    }));

    return [...finished, ...hanging].sort((a, b) => a.t_start - b.t_start);
  }
}

/** Turns the raw `getAllResponseHeaders()` text into name-value pairs. */
function parseResponseHeaders(raw: string): [string, string][] {
  return raw
    .trim()
    .split(/[\r\n]+/)
    .filter(Boolean)
    .map((line): [string, string] => {
      const separator = line.indexOf(':');
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    });
}
