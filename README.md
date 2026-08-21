# El Baúl

A private, shared photo archive for families — "baúles" (trunks) hold chapters
("capítulos") of photos that a custodian can share with collaborators and members.

## Philosophy

- Family memories first.
- Long-term maintainability over clever code.
- Clear, documented architecture.
- Independent deployability per service.

See [`docs/PRODUCT.md`](docs/PRODUCT.md) for the product mission, principles, priorities and
glossary behind these trade-offs.

## Repository layout

```text
api/            ASP.NET Core (.NET 10) backend
app/            React consumer frontend
app/android/    Capacitor Android wrapper around app/'s built dist/
app/ios/        Capacitor iOS wrapper around app/'s built dist/
admin/          React ops backoffice
e2e-tests/      Whole-repo Playwright smoke suite
imgproxy/       Image-resizing sidecar
docs/           Architecture standard, API conventions, design system
```

Monorepo, independently deployable services, no shared code between them.
Authentication uses an external OIDC provider (Zitadel in production).

## Quick start

### Prerequisites

- Node.js 22+
- .NET 10 SDK
- Docker

### Everything via Docker Compose

```bash
docker compose up --build
```

Brings up Postgres, MinIO, fake-oidc, the backend, the frontend, and the admin backoffice
together. See [`docs/operations/local-development.md`](docs/operations/local-development.md)
for the Docker/Vite frontend port contract and the fake-oidc login flow.

### Backend only

```bash
cd api
dotnet restore
dotnet run --project ElBaul.Api
```

See [`api/README.md`](api/README.md) for running dependencies locally, environment
configuration, tests, and Docker.

### Frontend only

```bash
cd app
cp .env.example .env
npm install
npm run dev
```

See [`app/README.md`](app/README.md) for environment configuration and tests.

## Git Hooks

This repository includes Git hooks in `.githooks/`. Enable them once per clone:

```bash
git config core.hooksPath .githooks
```

## Verification

All canonical verification commands run from the repository root:

```bash
./scripts/verify backend
./scripts/verify backend-acceptance
./scripts/verify frontend          # typecheck + Vitest + Storybook executable specs
./scripts/verify frontend-acceptance
./scripts/verify admin
./scripts/verify admin-acceptance
./scripts/verify e2e
./scripts/verify all
```

See [`docs/architecture/testing.md`](docs/architecture/testing.md) for what each level covers.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — entry point to the architecture docs, routes to the rest
- [`docs/API-CONVENTIONS.md`](docs/API-CONVENTIONS.md) — auth, error and authorization rules not visible in the OpenAPI schema (see `/swagger` for the routes/DTOs themselves)
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — product mission, priorities, principles and glossary
- [`docs/DESIGN.md`](docs/DESIGN.md) — the frontend design system
- [`api/README.md`](api/README.md) — backend development
- [`app/README.md`](app/README.md) — frontend development
- [`admin/README.md`](admin/README.md) — admin backoffice development

## Deployment

Deployment is automated via GitHub Actions — see [`.github/workflows/`](.github/workflows/).

## License

MIT © [Exeal](https://www.exeal.com)
