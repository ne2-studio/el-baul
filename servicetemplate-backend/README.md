# Service Template — Backend

Starting point for new backend services, scaffolded to match the conventions in
[`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md). ASP.NET Core (.NET 10) with a ports & adapters
layout, PostgreSQL via Dapper + FluentMigrator, JWT bearer auth, and Serilog.

It ships with one example resource — **tasks** (add/list/delete, paired with the frontend's task
list screen) — a minimal CRUD slice that exercises every convention end-to-end so you have a
working reference instead of an empty shell:

- `Result<T>` for expected failures instead of exceptions/try-catch-500
- an output port per external effect (`IClock`, `IIdGenerator`, `ITaskRepository`, `INotifier`)
- a caching **decorator** (`CachedTaskRepository`) composed at the DI root, registered `Singleton`
  as a deliberate, documented exception to the default `Scoped` lifetime
- the **Null Object pattern** for feature-flagged behavior (`INotifier` swaps between `LoggingNotifier`
  and `NullNotifier` based on `Features:Notifications:Enabled`, decided once in `ServiceRegistration`)
- a public, unauthenticated, rate-limited endpoint (`/health`) alongside JWT-protected resource endpoints
- two-tier testing: hand-written fakes for core/application logic, NSubstitute mocks for the infra decorator

## How to use this template

1. Copy `service-template/backend/` to the new service's `backend/` directory.
2. Rename `ServiceTemplate` throughout — project folders, `.csproj`/`.sln` file names, namespaces,
   `AssemblyName`s, and references to `ServiceTemplate.Api` / `ServiceTemplate.Infra` — to your
   `{ProjectName}`.
3. Replace the `Task` domain (entity, repository, use case, controller, migration) with your actual
   domain, keeping the same layering: `Ports/Input` for use-case contracts, `Ports/Output` for
   everything external, `Application/` for business logic, `Infra/` for adapters.
4. Update `Auth:Authority` / `Auth:Audience` in `appsettings.json`, the database name in the connection
   string, and the Serilog `Application` property.

## Architecture

```
ServiceTemplate        — domain core (use cases, ports)
ServiceTemplate.Infra  — adapters (PostgreSQL, caching decorator, notifier)
ServiceTemplate.Api    — HTTP entry point (controllers, JWT validation)
```

## API endpoints

Task management endpoints require a valid JWT (`Authorization: Bearer <token>`). Full request/response
shapes are documented in [`docs/API.md`](../docs/API.md).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/tasks` | Required | Create a task |
| `GET` | `/api/tasks` | Required | List tasks (paginated) |
| `DELETE` | `/api/tasks/{id}` | Required | Delete a task |
| `GET` | `/health` | Public (rate-limited) | Liveness check |

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/en-us/download)
- [Docker](https://www.docker.com/products/docker-desktop)

### Run PostgreSQL locally

```bash
docker run --name pg-servicetemplate \
  -e POSTGRES_USER=devuser \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=servicetemplate \
  -p 5432:5432 \
  -d postgres:16
```

To stop and remove the container:

```bash
docker stop pg-servicetemplate && docker rm pg-servicetemplate
```

### Run the API

```bash
dotnet run --project ServiceTemplate.Api
```

The API will be available at http://localhost:5050. Migrations run automatically at startup.

### Run tests

```bash
dotnet test
```

## Docker

Build the image:

```bash
docker build . -t servicetemplate-api
```

Run the container:

```bash
docker run --name servicetemplate-api \
  -e "ConnectionStrings__DefaultConnection=Host=host.docker.internal;Port=5432;Database=servicetemplate;Username=devuser;Password=devpass" \
  -p 5050:8080 \
  servicetemplate-api
```

## License

MIT © [Exeal](https://www.exeal.com)
