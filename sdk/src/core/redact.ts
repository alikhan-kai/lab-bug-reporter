/**
 * Модуль безопасности и очистки данных (Data Sanitization & Redaction)
 * Защищает от утечки токенов, паролей, cookies и персональных данных.
 */

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
  'x-auth-token'
]);

const SENSITIVE_KEY_REGEX = /(password|token|secret|access_token|refresh_token|api_key|credit_card|cvv|auth)/i;

/**
 * Маскирует чувствительные заголовки запросов и ответов
 */
export function sanitizeHeaders(headers: Record<string, string> | Headers | [string, string][] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers) return result;

  if (typeof (headers as Headers).forEach === 'function') {
    (headers as Headers).forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      result[lowerKey] = SENSITIVE_HEADERS.has(lowerKey) ? '[REDACTED]' : value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      const lowerKey = key.toLowerCase();
      result[lowerKey] = SENSITIVE_HEADERS.has(lowerKey) ? '[REDACTED]' : value;
    }
  } else if (typeof headers === 'object') {
    for (const key of Object.keys(headers)) {
      const lowerKey = key.toLowerCase();
      result[lowerKey] = SENSITIVE_HEADERS.has(lowerKey) ? '[REDACTED]' : String(headers[key]);
    }
  }

  return result;
}

/**
 * Очищает тело запроса/ответа от конфиденциальных полей (если это JSON)
 */
export function sanitizeBody(body: string | null | undefined, maxBytes: number = 64 * 1024): { body: string; truncated: boolean } {
  if (!body) return { body: '', truncated: false };

  let processed = body;

  try {
    const parsed = JSON.parse(body);
    if (typeof parsed === 'object' && parsed !== null) {
      maskSensitiveObject(parsed);
      processed = JSON.stringify(parsed);
    }
  } catch {
    // Не JSON — оставляем как текст
  }

  const truncated = processed.length > maxBytes;
  return {
    body: truncated ? processed.slice(0, maxBytes) : processed,
    truncated
  };
}

function maskSensitiveObject(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  for (const key of Object.keys(obj)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      obj[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object') {
      maskSensitiveObject(obj[key]);
    }
  }
}

/**
 * Безопасное усечение строк логов консоли
 */
export function truncateString(str: string, maxBytes: number = 4096): string {
  if (!str) return '';
  return str.length > maxBytes ? str.slice(0, maxBytes) + '... [TRUNCATED]' : str;
}
