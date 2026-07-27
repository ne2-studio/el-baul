# Whole-system E2E instructions

These tests validate wiring across the real composed stack (`docker-compose.yaml`: Postgres,
MinIO, imgproxy, fake-oidc, api, app, admin).

Do not duplicate behavioural coverage that belongs in `app/e2e/` — see
`../docs/architecture/testing.md` for the boundary between the two suites.

Do not import implementation code or DTOs from `api/`, `app/`, or `admin/`.

## Before finishing a task

Run `./scripts/verify e2e` from the repo root and fix all issues found.
