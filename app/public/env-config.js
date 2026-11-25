// Overwritten at container start by docker-entrypoint.d/95-generate-runtime-env.sh, and in CI
// before the Cloudflare Pages deploy (see src/runtimeConfig.ts). This checked-in default ships
// as-is in the native/Capacitor build and in any context that does neither — an empty object
// here just means every runtime-config lookup falls back to the Vite build-time value.
window.__ENV__ = {};
