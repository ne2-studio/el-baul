// Overwritten at container start by docker-entrypoint.d/95-generate-runtime-env.sh, and in CI
// before the Cloudflare Pages deploy (see src/runtimeConfig.ts). This checked-in default ships
// as-is in any context that does neither (e.g. `npm run dev`/`vite preview`) — an empty object
// here just means every runtime-config lookup falls back to the Vite build-time value.
window.__ENV__ = {};
