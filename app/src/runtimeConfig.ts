declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

type RuntimeEnvKey =
  | 'VITE_API_URL'
  | 'VITE_OIDC_AUTHORITY'
  | 'VITE_OIDC_CLIENT_ID'
  | 'VITE_OIDC_CALLBACK_URI'
  | 'VITE_ZITADEL_ORGANIZATION_ID'
  | 'VITE_SENTRY_DSN'
  | 'VITE_PUBLIC_POSTHOG_PROJECT_TOKEN'
  | 'VITE_PUBLIC_POSTHOG_HOST';

// Runtime override (window.__ENV__, from env-config.js — rendered by the nginx entrypoint
// docker-entrypoint.d/95-generate-runtime-env.sh in the Docker image, and by the CI deploy job
// before Cloudflare Pages) wins when present and non-empty; otherwise
// falls back to the Vite build-time value, which is what native/PWA builds and any deploy
// that hasn't configured a runtime override still get.
export function getEnv(key: RuntimeEnvKey): string {
  return window.__ENV__?.[key] || (import.meta.env[key] as string) || '';
}
