import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (!SENTRY_DSN) {
  throw new Error('SENTRY_DSN is not defined in the environment variables');
}


Sentry.init({
  dsn: SENTRY_DSN,
    integrations: [
      Sentry.captureConsoleIntegration({
        levels: ['log', 'info', 'warn', 'error'], // Capture these log levels as breadcrumbs
      }),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

export default Sentry;
