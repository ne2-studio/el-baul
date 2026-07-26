# Local development

## Everything via Docker Compose

`docker-compose.yaml` at the repo root runs Postgres, MinIO, imgproxy,
[fake-oidc](https://github.com/ne2-studio/fake-oidc), the API, the frontend, and the admin
backoffice together, each built from its own Dockerfile:

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (`app/`) | http://localhost:3000 |
| Admin backoffice (`admin/`) | http://localhost:3001 |
| Backend (`api/`) | http://localhost:5050 |
| Postgres | localhost:5432 |
| MinIO console | http://localhost:9001 |
| fake-oidc | http://localhost:5000 |

fake-oidc is a throwaway OIDC provider for local/E2E use — there's no login UI, users are
selected via `login_hint`. The compose file preconfigures two test users (`admin`, `user`) and
two clients (`el-baul-app`, `el-baul-admin`); the `admin` test user carries the `admin` role, so
it's the one to sign into the backoffice with — `user` will hit `AccessDenied` there. See the
[fake-oidc README](https://github.com/ne2-studio/fake-oidc) for the full flow.

## Backend only, against host-run dependencies

Bring up just the dependencies:

```bash
docker compose up postgres minio fake-oidc
```

```bash
cd api
dotnet run --project ElBaul.Api
```

The API is then available at http://localhost:5050, expecting fake-oidc at
`http://localhost:5000` (see `appsettings.json`'s `Auth` section) — matches the compose setup
above. Migrations and the MinIO bucket are created automatically at startup.

### Backend in Docker, pointed at host services

```bash
cd api
docker build . -t el-baul-api

docker run --name el-baul-api \
  -e "ConnectionStrings__DefaultConnection=Host=host.docker.internal;Port=5432;Database=elbaul;Username=devuser;Password=devpass" \
  -e "Auth__JwksUri=http://host.docker.internal:5000/.well-known/jwks.json" \
  -e "Auth__ValidIssuer=http://localhost:5000" \
  -e "Auth__Audience=el-baul-app" \
  -e "Storage__Endpoint=http://host.docker.internal:9000" \
  -e "Storage__PublicEndpoint=http://localhost:9000" \
  -e "Storage__AccessKey=minioadmin" \
  -e "Storage__SecretKey=minioadmin" \
  -p 5050:8080 \
  el-baul-api
```

## Frontend only

```bash
cd app
cp .env.example .env
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`. You'll need the backend (and, for a full login
flow, fake-oidc) running too.

## Admin only

```bash
cd admin
npm install
npm run dev
```

Runs at `http://localhost:3001`. Sign in with the `admin` fake-oidc test user — see the table
above.
