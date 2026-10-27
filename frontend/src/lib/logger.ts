import * as Sentry from '@sentry/react';

const isDev = import.meta.env.DEV;

const UUID_SEGMENT = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi;
const NUMERIC_SEGMENT = /\/\d+(?=\/|$)/g;

/** Only makes relative URLs parseable; the origin is discarded either way. */
const RELATIVE_URL_BASE = 'http://relative.invalid';

/** `/api/v1/projects/<uuid>/photos` -> `/api/v1/projects/:id/photos`.
 *  Drops the origin and query string so no ids or tokens reach Sentry. */
export function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url, RELATIVE_URL_BASE);
    return parsed.pathname.replace(UUID_SEGMENT, '/:id').replace(NUMERIC_SEGMENT, '/:id');
  } catch {
    return '/unparsable';
  }
}

export const logger = {
  debug(...args: unknown[]): void {
    if (isDev) console.debug(...args);
  },

  info(...args: unknown[]): void {
    if (isDev) console.info(...args);
  },

  warn(message: string, ...args: unknown[]): void {
    if (isDev) console.warn(message, ...args);
  },

  /** `context` must hold only values safe to leave the user's device. */
  error(message: string, cause?: unknown, context?: Record<string, string | number>): void {
    if (isDev) console.error(message, cause ?? '', context ?? '');

    const error = cause instanceof Error ? cause : new Error(message);
    Sentry.captureException(error, {
      tags: { source: 'client' },
      extra: { message, ...(context ?? {}) },
    });
  },

  /** 4xx stay out of Sentry: the UI already surfaces them, and reporting them
   *  would bury real failures. 5xx and transport failures escalate. */
  apiError(url: string, status: number, method: string = 'GET'): void {
    const route = scrubUrl(url);

    if (isDev) console.error(`[api] ${method} ${route} -> ${status}`);

    if (status >= 500 || status === 0) {
      Sentry.captureMessage(`API ${method} ${route} -> ${status}`, {
        level: 'error',
        tags: {
          source: 'client',
          http_status: String(status),
          http_method: method,
          route,
        },
      });
    }
  },
};
