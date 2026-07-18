import * as Sentry from '@sentry/capacitor';
import * as SentryReact from '@sentry/react';
import type { ErrorEvent } from '@sentry/react';
import { Capacitor } from '@capacitor/core';
import { version } from '../package.json';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

  if (!dsn) return;

  Sentry.init(
    {
      dsn,
      release: `el-baul-app@${version}`,
      environment: Capacitor.isNativePlatform() ? 'android' : import.meta.env.MODE,

      integrations: [Sentry.browserTracingIntegration()],

      // Errors: siempre. Traces: muestreo bajo, solo para tener contexto de rendimiento.
      tracesSampleRate: 0.05,
      tracePropagationTargets: [import.meta.env.VITE_API_URL as string],

      sendDefaultPii: false,
      beforeSend: sanitizeEvent,
    },
    SentryReact.init,
  );
}

// api.ts incrusta emails en la URL de algunas peticiones (p.ej. revocar acceso
// por email), así que hay que redactarlos antes de que salgan de la app.
function sanitizeEvent(event: ErrorEvent): ErrorEvent {
  if (event.request?.url) {
    event.request.url = redactEmails(event.request.url);
  }

  event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => {
    if (typeof breadcrumb.data?.url === 'string') {
      breadcrumb.data.url = redactEmails(breadcrumb.data.url);
    }
    return breadcrumb;
  });

  return event;
}

function redactEmails(url: string): string {
  return url.replace(/[^/]+@[^/]+/g, '[redacted-email]');
}
