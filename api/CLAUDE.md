# Backend instructions

Read `../docs/architecture/backend.md` before changing project boundaries, application
boundaries, persistence, or infrastructure adapters.

Read `../docs/API-CONVENTIONS.md` before changing API authentication, authorization, or
observable error semantics.

## API contract changes

If DTOs or controllers change the HTTP contract, run from the repo root:
`./scripts/openapi accept-contract`, `./scripts/openapi generate-types`,
`./scripts/verify backend`, `./scripts/verify frontend`, and `./scripts/verify admin`.
