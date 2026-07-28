# el-baul-api-lite (in-memory image for frontend testing)

A second, independently built Docker image — `ElBaul.Api.Lite/Dockerfile` — that runs the same
API surface as `el-baul-api` but with every output port backed by an in-memory adapter instead
of Postgres/MinIO/imgproxy/Hangfire/OpenAI. It exists so Playwright/frontend work can run
against a fast, deterministic, disposable backend instead of the full compose stack. See
[`../architecture/testing.md`](../architecture/testing.md) for how `app/acceptance-tests/` uses it.

It is a **separate image**, not a flag: there's no `ASPNETCORE_ENVIRONMENT`-style switch that
turns `el-baul-api` into this. `ElBaul.Api.Common`/`ElBaul.Infra.Common` hold everything that
must stay identical between the two (auth, CORS, rate limiting, controllers, the manager DI
graph, user-sync logic) precisely so the HTTP pipeline and auth/user-sync logic can never
silently diverge between images — only the project graph differs:

```
ElBaul.Api.Lite ──┐
                  ├──→  ElBaul.Api.Common  ──┐
                  │                          ├──→  ElBaul.Infra.Common  ──→  ElBaul
                  └──→  ElBaul.Infra.Lite  ──┘
```

| Port | Real (`el-baul-api`) | Lite (`el-baul-api-lite`) |
|---|---|---|
| Repositories (`I*Repository`) | EF Core / Postgres | `InMemory*Repository` — the exact classes `ElBaul.Tests` uses, singleton-scoped so a run's data survives across requests |
| `IPhotoStorage` | MinIO + signed imgproxy URLs | `LitePhotoStorage` — an in-memory byte dictionary; `GetImageUrl` points at this image's own unauthenticated `GET /lite/photos/{*key}` endpoint instead of imgproxy |
| `IEmailSender`, `IAiChatBackend`, `IEmbeddingBackend`, `ISupportBackend`, `IEmailTemplateRenderer`, `IPhotoDateExtractor` | Real providers (Resend/SMTP, OpenAI, LeadHub, HTML templates, EXIF) | Deterministic fakes (`ElBaul.Tests`'s `Fake*` classes) — no real network calls, no cost, no flaky third parties |
| `IBackgroundJobScheduler` | Hangfire + Postgres storage | `FakeBackgroundJobScheduler` — records the call and does nothing else. **Welcome/weekly-digest emails are never actually sent in this image** — no Hangfire at all, not even an in-memory storage provider |
| `IClock`, `IIdGenerator`, `ICurrentUserProvider`, `IAppConfiguration`, `IUserInfoClient` | Real implementations | The **same** real implementations (`ElBaul.Infra.Common`) — these don't touch Postgres/S3/Hangfire, so there's nothing to fake |
| Auth (JWT/OIDC) | fake-oidc / Zitadel | Unchanged — still needs a real fake-oidc container to mint tokens against |

Build and run it (paired with `fake-oidc` for login):

```bash
cd api
docker build -f ElBaul.Api.Lite/Dockerfile -t el-baul-api-lite:local .

docker network create el-baul-lite-test
docker run -d --name fake-oidc --network el-baul-lite-test -p 5000:5000 \
  -e OIDC_ISSUER="http://localhost:5000" \
  -e OIDC_CLIENTS='[{"clientId":"el-baul-app","redirectUris":["http://localhost:3000/callback","http://localhost:5173/callback"]}]' \
  -e OIDC_USERS='[{"key":"admin","sub":"admin-user","email":"admin@test.local","name":"Admin User","roles":["admin"]}]' \
  ghcr.io/ne2-studio/fake-oidc:latest

docker run -d --name el-baul-api-lite --network el-baul-lite-test -p 5051:8080 \
  -e Auth__JwksUri="http://fake-oidc:5000/.well-known/jwks.json" \
  -e Auth__ValidIssuer="http://localhost:5000" \
  -e Auth__Audience="el-baul-app" \
  -e Auth__UserInfoEndpoint="http://fake-oidc:5000/oidc/v1/userinfo" \
  -e Api__PublicUrl="http://localhost:5051" \
  el-baul-api-lite:local
```

`Api__PublicUrl` matters here specifically because `LitePhotoStorage` uses it to build the
`/lite/photos/{key}` URLs it hands back — it must be the address whatever's consuming the API
(a browser, Playwright) will actually reach the container on, not an internal Docker hostname.

Everything lives in memory for the container's process lifetime — `docker restart` (or a fresh
`docker run`) is currently the only way to reset state; there is no `/test/reset` endpoint yet.
`appsettings.json` in `ElBaul.Api.Lite/` carries the rest of the defaults (`RateLimiter`,
`Features`, `Serilog`) — override via env vars the same way as the real image.

This image is **not** exercised by `api/acceptance-tests/` and shouldn't be — that suite exists
specifically to verify the real image against real infrastructure. There's currently no
automated check that `el-baul-api-lite` still builds/works on its own; `app/acceptance-tests/` running
successfully in CI is the closest thing to one today.
