# Bakes the static imgproxy config (allowed presets) into the image so
# deployment (e.g. Coolify) only needs to inject secrets/environment-specific
# values (S3 endpoint/credentials, signing key/salt) at runtime.
FROM ghcr.io/imgproxy/imgproxy:latest

COPY presets.conf /etc/imgproxy/presets.conf

# ONLY_PRESETS is off so the API can append gravity:fp (focal point) + zoom on top of
# a preset — needed for per-persona avatar crop/zoom (see ImgproxyUrlBuilder.cs). The
# security boundary is the HMAC signature (IMGPROXY_KEY/SALT), not the preset allowlist:
# every URL is still built and signed server-side by the API, so a client can request
# arbitrary processing options only if it already has the signing key, at which point
# ONLY_PRESETS wouldn't have protected anything anyway.
ENV IMGPROXY_ONLY_PRESETS="false" \
    IMGPROXY_PRESETS_PATH="/etc/imgproxy/presets.conf" \
    IMGPROXY_AUTO_WEBP="true"
