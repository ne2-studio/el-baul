#!/bin/sh
set -eu

# nginx's own entrypoint auto-runs every executable script here before starting nginx (and
# already ships envsubst — it uses the same binary for its own template feature). An explicit
# variable list, not envsubst's default "substitute everything" behavior, so unrelated
# $-looking text elsewhere in the template can never be touched by accident.
envsubst '${VITE_API_URL} ${VITE_OIDC_AUTHORITY} ${VITE_OIDC_CLIENT_ID} ${VITE_OIDC_CALLBACK_URI} ${VITE_ZITADEL_ORGANIZATION_ID} ${VITE_SENTRY_DSN}' \
  < /usr/share/nginx/html/env-config.template.js \
  > /usr/share/nginx/html/env-config.js
