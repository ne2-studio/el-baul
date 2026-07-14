# Bakes the static imgproxy config (allowed presets) into the image so
# deployment (e.g. Coolify) only needs to inject secrets/environment-specific
# values (S3 endpoint/credentials, signing key/salt) at runtime.
FROM ghcr.io/imgproxy/imgproxy:latest

COPY presets.conf /etc/imgproxy/presets.conf

ENV IMGPROXY_ONLY_PRESETS="true" \
    IMGPROXY_PRESETS_PATH="/etc/imgproxy/presets.conf" \
    IMGPROXY_AUTO_WEBP="true"
