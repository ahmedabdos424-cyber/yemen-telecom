import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { logger } from './logger';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.warn('[SENTRY] SENTRY_DSN not set — Sentry disabled');
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    maxBreadcrumbs: 100,
    debug: false,
    beforeSend(event) {
      if (event.request?.url?.includes('/api/health')) {
        return null;
      }
      return event;
    },
  });

  logger.info('[SENTRY] Initialized');
  return true;
}

export function setSentryUser(user: { id: number; role: string; username: string } | null) {
  if (!process.env.SENTRY_DSN) return;
  if (user) {
    Sentry.setUser({ id: String(user.id), username: user.username, role: user.role });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
