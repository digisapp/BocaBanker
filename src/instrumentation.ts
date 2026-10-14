import * as Sentry from '@sentry/nextjs';

// Next only runs the Sentry server/edge configs through this hook; without it
// Sentry.init never runs and logger.error's captureException goes nowhere.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');

    // Say what's misconfigured once at startup, instead of each route
    // failing on its own later. A warning, not a crash: most pages still work.
    const { serverEnvProblems } = await import('./lib/env');
    const problems = serverEnvProblems();
    if (problems.length > 0) {
      console.warn(`[env] Missing or invalid environment variables:\n  - ${problems.join('\n  - ')}`);
    }
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
