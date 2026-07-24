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
  | 'VITE_SENTRY_DSN';

// Runtime override (window.__ENV__, set by the nginx entrypoint — see
// docker-entrypoint.d/95-generate-runtime-env.sh) wins when present and non-empty; otherwise
// falls back to the Vite build-time value, which is what native/PWA builds and any deploy
// that hasn't configured a runtime override still get.
export function getEnv(key: RuntimeEnvKey): string {
  return window.__ENV__?.[key] || (import.meta.env[key] as string) || '';
}
