// Overwritten at container start by docker-entrypoint.d/95-generate-runtime-env.sh (see
// src/runtimeConfig.ts). This checked-in default ships as-is in any context that never runs
// that entrypoint (e.g. `npm run dev`/`vite preview`) — an empty object here just means every
// runtime-config lookup falls back to the Vite build-time value, i.e. today's behavior.
window.__ENV__ = {};
