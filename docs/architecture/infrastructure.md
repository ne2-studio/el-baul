# Infrastructure

Cross-cutting integrations used by [`backend.md`](backend.md). Auth is covered there, not here.

## Photo storage & image serving

Uploaded photo bytes live in MinIO (S3-compatible); the API never hands out a MinIO URL or reads
photo bytes back out over HTTP itself:

- `IPhotoStorage.SaveAsync`/`DeleteAsync` write/delete objects in MinIO, keyed by an opaque
  string the `Application` layer chooses.
- `IPhotoStorage.GetImageUrl(key, placement, crop?)` returns a signed **imgproxy** URL instead of
  a raw storage URL. `ImgproxyUrlBuilder` (`ElBaul.Infra`) builds the `s3://` source, maps a
  placement (thumbnail, full-size, cover, avatar, …) to a **named preset** configured server-side
  in `imgproxy/presets.conf`, and HMAC-signs the path with a shared key/salt. An optional
  `ImageCrop` (focal point + zoom) is appended as `gravity:fp` (focal point) and, when zoomed in,
  `crop` (relative pre-crop around that point) processing options on top of the preset — used for
  persona avatars and chapter/baúl covers so the user-chosen crop is resampled by imgproxy
  against the original resolution, instead of a client-side CSS `transform: scale()`. Not
  imgproxy's `zoom` option: that's Pro-only and silently no-ops on the OSS build this repo runs
  (see `ImgproxyUrlBuilder`).
- imgproxy is the *only* component that ever reads from MinIO — it holds its own S3 credentials
  and fetches originals directly over the internal Docker network. `IMGPROXY_ONLY_PRESETS` is
  **off**, so arbitrary processing options (like the crop override above) are accepted; the
  security boundary is the HMAC signature, not a preset allowlist — every URL is still built and
  signed server-side by the API, so a leaked signing key would be able to request an arbitrary
  render regardless of ONLY_PRESETS.

## Containers

- Backend: multi-stage .NET SDK → ASP.NET runtime image, port 8080.
- Frontends (`app/`, `admin/`): built by Vite in a Dockerfile build stage, served as static
  `dist/` by `nginx:alpine` (port 80, SPA-fallback `nginx.conf`). `app/`'s image also runs a
  runtime-config entrypoint script on container start so the *same built image* can be pointed
  at a different backend without rebuilding — see [`frontend.md`](frontend.md#conventions).
  `admin/`'s image has no equivalent mechanism; its config is baked in at build time only.
- `imgproxy/` has its own minimal `Dockerfile`/`presets.conf`.

See [`../operations/local-development.md`](../operations/local-development.md) for running these
locally and [`deployment.md`](deployment.md) for how they're built/pushed in CI.
