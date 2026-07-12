# Service Template

Starting point for new `exeal/ne2-studio` projects: a monorepo with a `frontend/` and `backend/`
scaffolded to match [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What's here

| Directory | Contents |
|-----------|----------|
| `docs/ARCHITECTURE.md` | The architecture standard both services should follow |
| `docs/API.md` | The API contract for the `Task` reference slice |
| `backend/` | ASP.NET Core (.NET 10) ports & adapters scaffold, with a `Task` CRUD slice as a working reference implementation — see [`backend/README.md`](backend/README.md) |
| `frontend/` | React 19 + Vite + Zustand scaffold, consuming the same `Task` domain — see [`frontend/README.md`](frontend/README.md) |
| `.github/workflows/` | Path-filtered CI/CD for each service (build → test → Docker image → registry → deploy webhook) |

The `Task` example resource (add/list/delete a task list) exists to exercise every layer/convention
end-to-end, front-to-back, so you have a working slice to read and adapt, not to demonstrate a
real feature. Replace it with the new project's actual domain — see each service's README for the
specific steps.

## Using this template for a new project

1. Copy `backend/` and `frontend/` into the new project's repo.
2. Follow the "How to use this template" steps in [`backend/README.md`](backend/README.md) and
   [`frontend/README.md`](frontend/README.md) to rename `ServiceTemplate`/`{ProjectName}` throughout
   and swap in the real domain.
3. Update `.github/workflows/*.yml`: image names under `env.IMAGE_NAME` and the Coolify webhook
   secrets need to point at the new project, not whatever they were copied from.
4. Update this file and `docs/ARCHITECTURE.md` if the new project deviates from the standard
   layout — the architecture doc should stay authoritative for the project going forward.

## Architecture

Two independently deployable services, no shared code between them:

| Directory | Stack |
|-----------|-------|
| `frontend/` | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, react-oidc-context |
| `backend/` | ASP.NET Core (.NET 10), PostgreSQL, Serilog |

Auth is OIDC/JWT Bearer end-to-end: the frontend authenticates against an external OIDC provider
and attaches the access token to every API call; the backend validates it via `JwtBearer`
middleware. Full conventions and rationale are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Getting started

### Prerequisites

- Node.js 22+
- .NET 10 SDK
- Docker (for PostgreSQL locally, and for building images)

### Backend

```bash
cd backend
dotnet restore
dotnet run --project ServiceTemplate.Api
```

See [`backend/README.md`](backend/README.md) for running PostgreSQL locally, environment
configuration, tests, and Docker.

### Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL to the backend URL, and the OIDC authority/client_id in src/main.tsx

npm install
npm run dev
```

See [`frontend/README.md`](frontend/README.md) for details.

### Everything via Docker Compose

`docker-compose.yaml` at the repo root spins up Postgres, the backend, and the frontend together,
each service built from its own `Dockerfile`. The frontend image only copies a pre-built `dist/`
(it doesn't run `npm run build` itself), so build the frontend once first:

```bash
cd frontend && cp .env.example .env && npm install && npm run build && cd ..
docker compose up --build
```

Backend: http://localhost:5050 · Frontend: http://localhost:3000 · Postgres: localhost:5432.

## Deployment

Both services are containerized and deploy independently. CI/CD runs on push to `main`
(path-filtered per service), builds a Docker image, pushes it to GitHub Container Registry, and
triggers a Coolify deploy webhook — see `.github/workflows/backend-deploy.yml` and
`frontend-deploy.yml`.

## License

MIT © [Exeal](https://www.exeal.com)
