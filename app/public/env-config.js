// Overwritten at container start by docker-entrypoint.d/95-generate-runtime-env.sh (see
// src/runtimeConfig.ts). This checked-in default ships as-is in the native/Capacitor build and
// in any context that never runs that entrypoint — an empty object here just means every
// runtime-config lookup falls back to the Vite build-time value, i.e. today's behavior.
window.__ENV__ = {};
