---
name: verify
description: "Risk-based verification knowledge for El Baul: how to classify the risks a diff introduces and which evidence/command covers each."
model: haiku
---

## Goal

Cover every risk the diff introduces with the smallest evidence set. A correct-looking
diff is not evidence; an unverified risk means not done.

## Classifying risk

1. Inspect the diff, including tests and docs.
2. Identify the observable behavior changed (user behavior, API contract, data shape,
   persistence, command effect, runtime wiring, visual output).
3. Classify each with the matrix below and pick the narrowest checks that cover it,
   adding tests where a manual check would otherwise be the only evidence.

## Risk matrix

| Risk | Evidence | Command | Escalate to real infra when |
|---|---|---|---|
| Domain/application logic | Unit test: success + failure path | `backend` | Touches DB translation, storage, auth tokens, hosted services, container config |
| Persistence and EF | Unit + acceptance against real Postgres | `backend` + `backend-acceptance` | Entities, EF config, queries, converters, indexes, transactions, raw SQL changed |
| Migrations | Review + acceptance applying built API against real Postgres | `backend-acceptance` | Always |
| HTTP contract/serialization | Controller/unit or black-box acceptance on status/headers/auth/JSON shape | `backend`; add `backend-acceptance` for public contracts | Built image, auth, middleware, serialization, client compat |
| Infra/CI/environment | Test or smoke proving wrappers, env vars, startup, health, connectivity | affected command; `backend-acceptance`/`e2e` for real services | Dockerfile, compose, workflow, env contract, service wiring changed |
| Frontend behavior | Vitest/component or acceptance spec on the user-visible transition | `frontend`; add `frontend-acceptance` for covered journeys | Built frontend image, routing, auth, API-lite wiring, browser-only behavior |
| Visual behavior | Functional assertions + inspected screenshot | command for the behavior | Browser layout, real media, imgproxy, build output, responsive rendering |
| Full-stack wiring | Smoke through login + changed integration point on real compose | `e2e` | API/app/imgproxy/OIDC/Postgres/MinIO wiring or prod image interaction changed |
| Maintenance commands | Dry-run/apply/idempotency tests | `backend`; add live run via `run` when persistence/storage/provider effects matter | Real persistence, storage, external providers, deploy order, idempotency |

When persistence matters: act, reload from the durable store, assert again.

## Commands

Run only through `./scripts/verify`.
- Pick the smallest command(s) for the changed areas, or `all` when changes span several.
- Add `--changed` for day-to-day feedback.
- Drop `--changed` — i.e. run the plain command — when a risk needs full-suite confidence; plain commands are also what CI runs.

```
backend  backend-persistence  backend-acceptance  frontend  frontend-acceptance  admin  admin-acceptance  e2e  all
```

`docs/architecture/testing.md` documents what each suite covers.

## Browser and live verification

- Use `run` for a live stack, logged-in browser, bearer token, real storage, or container
  command; use the URL/environment it returns.
- Prefer automated tests over manual Playwright driving.
- Attach listeners before acting: console errors, page errors, and unexpected network
  failures fail verification.
- Don't ignore imgproxy or other service errors unless the scenario intentionally tests
  an error path.
- Visual changes need actual inspection at relevant viewports; screenshots complement
  functional assertions, they don't replace them.
- Purely internal changes don't need image tests unless they affect a critical user
  journey or visible output.
