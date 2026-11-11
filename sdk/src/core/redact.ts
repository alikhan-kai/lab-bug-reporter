/**
 * Модуль безопасности и очистки данных (Data Sanitization & Redaction)
 * По ТЗ (раздел 5): «The SDK replaces the values of Authorization, Cookie and Set-Cookie
 * with [REDACTED]. This is the only redaction rule.»
 */

const ONLY_AUTH_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie'
]);

/**
 * Маскирует ТОЛЬКО заголовки Authorization, Cookie и Set-Cookie
 */
export function sanitizeHeaders(headers: Record<string, string> | Headers | [string, string][] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers) return result;

  if (typeof (headers as Headers).forEach === 'function') {
    (headers as Headers).forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      result[lowerKey] = ONLY_AUTH_HEADERS.has(lowerKey) ? '[REDACTED]' : value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      const lowerKey = key.toLowerCase();
      result[lowerKey] = ONLY_AUTH_HEADERS.has(lowerKey) ? '[REDACTED]' : value;
    }
  } else if (typeof headers === 'object') {
    for (const key of Object.keys(headers)) {
      const lowerKey = key.toLowerCase();
      result[lowerKey] = ONLY_AUTH_HEADERS.has(lowerKey) ? '[REDACTED]' : String(headers[key]);
    }
  }

  return result;
}

/**
 * Ограничение тела запроса/ответа по размеру (по умолчанию 64 КБ)
 */
export function sanitizeBody(body: string | null | undefined, maxBytes: number = 64 * 1024): { body: string; truncated: boolean } {
  if (!body) return { body: '', truncated: false };

  const truncated = body.length > maxBytes;
  return {
    body: truncated ? body.slice(0, maxBytes) : body,
    truncated
  };
}

/**
 * Безопасное усечение строк логов консоли (по умолчанию 4 КБ)
 */
export function truncateString(str: string, maxBytes: number = 4096): string {
  if (!str) return '';
  return str.length > maxBytes ? str.slice(0, maxBytes) + '... [TRUNCATED]' : str;
}
