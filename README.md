# El Baúl

A private, shared photo archive for families — "baúles" (trunks) hold chapters
("capítulos") of photos that a custodian can share with collaborators and members.

Monorepo with independently deployable services, no shared code between them, following
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md):

| Directory | Contents |
|-----------|----------|
| `docs/ARCHITECTURE.md` | The architecture standard both services follow |
| `docs/DESIGN.md` | The design system (colors, typography, spacing) the frontend implements |
| `docs/API.md` | The API contract for the backend |
| `api/` | ASP.NET Core (.NET 10) ports & adapters backend — see [`api/README.md`](api/README.md) |
| `app/` | React 19 + Vite + Zustand consumer frontend — see [`app/README.md`](app/README.md) |
| `admin/` | React 19 + Vite + Zustand ops backoffice (Dashboard/Usuarios/Baúles), same `api/`, gated by a Zitadel "admin" role |
| `.github/workflows/` | Path-filtered CI/CD for each service (build → test → Docker image → registry → deploy webhook) |

## Architecture

| Directory | Stack |
|-----------|-------|
| `app/` | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, react-oidc-context |
| `admin/` | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, react-oidc-context |
| `api/` | ASP.NET Core (.NET 10), PostgreSQL (EF Core), MinIO (S3-compatible photo storage), Serilog |

Auth is OIDC/JWT Bearer end-to-end: the frontend authenticates against an external OIDC
provider, attaches the access token to every API call, and the backend validates it via
`JwtBearer` middleware — there is no Supabase (or any other bespoke auth) anywhere in the
stack. Full conventions and rationale are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Getting started

### Prerequisites

- Node.js 22+
- .NET 10 SDK
- Docker (for PostgreSQL/MinIO/fake-oidc locally, and for building images)

### Backend

```bash
cd api
dotnet restore
dotnet run --project ElBaul.Api
```

See [`api/README.md`](api/README.md) for running PostgreSQL/MinIO locally, environment
configuration, tests, and Docker.

### Frontend

```bash
cd app
cp .env.example .env
# VITE_API_URL, VITE_OIDC_AUTHORITY, VITE_OIDC_CLIENT_ID, VITE_ZITADEL_ORGANIZATION_ID are read from .env

npm install
npm run dev
```

### Everything via Docker Compose

`docker-compose.yaml` at the repo root spins up Postgres, MinIO, a [fake-oidc](https://github.com/ne2-studio/fake-oidc)
identity provider, the backend, the frontend, and the admin backoffice together, each
service built from its own Dockerfile. Both frontends' Dockerfiles run `npm run build`
themselves in a build stage (the `VITE_*` build args are set in `docker-compose.yaml` to
point at the other local services), so no separate frontend build step is needed:

```bash
docker compose up --build
```

Frontend: http://localhost:3000 · Admin backoffice: http://localhost:3001 · Backend:
http://localhost:5050 · Postgres: localhost:5432 · MinIO console: http://localhost:9001 ·
fake-oidc: http://localhost:5000.

fake-oidc is a throwaway OIDC provider for local/E2E use — there's no login UI, users are
selected via `login_hint`. The compose file preconfigures two test users (`admin`, `user`)
and two clients (`el-baul-app`, `el-baul-admin`); sign in from the app as you normally would
and fake-oidc will issue a token for whichever user was selected. The `admin` test user
carries the `admin` role, so it's the one to sign into the backoffice with — `user` will hit
`AccessDenied`. See the [fake-oidc README](https://github.com/ne2-studio/fake-oidc) for the
full flow.

## Deployment

All services are containerized and deploy independently. CI/CD runs on push to `main`
(path-filtered per service), builds a Docker image, pushes it to GitHub Container Registry,
and triggers a Coolify deploy webhook — see `.github/workflows/backend-deploy.yml`,
`frontend-deploy.yml`, and `admin-deploy.yml`.

The frontend's `npm run build` never talks to Sentry — it only stamps deterministic debug
ids into `dist/` locally (`sentry-cli sourcemaps inject`). Uploading those sourcemaps is a
separate, explicit script (`npm run sentry:upload-sourcemaps`, needs `SENTRY_AUTH_TOKEN`)
that only CI runs, against the exact `dist/` copied out of the already-built image
(`docker create` + `docker cp .../usr/share/nginx/html`) — see `frontend-deploy.yml`.

## License

MIT © [Exeal](https://www.exeal.com)
