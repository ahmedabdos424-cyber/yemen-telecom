import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const RELEASE = import.meta.env.VITE_SENTRY_RELEASE as string | undefined;

export function initFrontendSentry() {
  if (!DSN) {
    if (import.meta.env.DEV) {
      console.log('[SENTRY] VITE_SENTRY_DSN not set — Sentry disabled');
    }
    return false;
  }

  Sentry.init({
    dsn: DSN,
    release: RELEASE,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 0,
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value || '';
      if (msg.includes('ResizeObserver') || msg.includes('NetworkError') || msg.includes('ChunkLoadError')) {
        return null;
      }
      return event;
    },
  });

  return true;
}

export function setFrontendSentryUser(user: { id: number; username: string; role: string } | null) {
  if (!DSN) return;
  if (user) {
    Sentry.setUser({ id: String(user.id), username: user.username, role: user.role });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
