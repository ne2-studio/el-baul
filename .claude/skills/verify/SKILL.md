---
name: verify
description: "Selects and runs risk-based verification for El Baul changes. Use before considering implementation work complete."
model: haiku
---

## Goal

Verify the smallest evidence set that covers every risk introduced by the diff.
Do not run every suite by default, and do not call a change verified while any
relevant risk lacks evidence. A correct-looking diff is not evidence.

## Required workflow

1. Inspect the diff, including tests and docs.
2. Identify the observable behavior changed: user behavior, API contract, data
   shape, persistence effect, command effect, runtime wiring, or visual output.
3. Classify the introduced risks with the matrix below.
4. Select the necessary checks. Prefer the narrowest automated test that can
   fail for the risk.
5. Add or extend tests when a reasonably automatable manual check would be the
   only evidence.
6. Run the repository's canonical verification commands from the repo root.
7. Use the `run` skill only when a live environment is required for browser,
   API, persistence, storage, container, or command verification. Do not start
   servers manually when `run` provides the environment.
8. Report evidence and gaps. If any risk remains unverified, the work is not
   done.

## Risk matrix

| Risk introduced | Minimum evidence | Canonical command | Escalate to real infrastructure when | Manual verification is appropriate when |
|---|---|---|---|---|
| Domain or application logic | Unit test around the changed rule, success and relevant failure path | `./scripts/verify backend` | The rule depends on database translation, storage, auth tokens, hosted services, or container config | The behavior is operationally observable but not automatable yet; add a test first if practical |
| Persistence and EF | Unit coverage for business intent plus acceptance coverage against real Postgres | `./scripts/verify backend` and `./scripts/verify backend-acceptance` | Entities, EF configuration, queries, value converters, indexes, transactions, or raw SQL changed | Rarely; use only to inspect live data after automated coverage exists |
| Migrations | Migration review plus acceptance coverage applying the built API against real Postgres | `./scripts/verify backend-acceptance` | Always for added, changed, or removed migrations | Only to inspect schema/data after migration if the risk is not captured by tests |
| HTTP contract or serialization | API/controller/unit coverage or black-box acceptance asserting status, headers, auth, and JSON shape | `./scripts/verify backend`; add `./scripts/verify backend-acceptance` for public contract changes | The built image, auth, middleware, serialization settings, or client compatibility matters | To inspect an endpoint manually after automated contract assertions exist |
| Infrastructure, CI, and environment | Test or smoke proving changed wrappers, env vars, image startup, health, and service connectivity | The affected `./scripts/verify ...` command; use `./scripts/verify backend-acceptance` or `./scripts/verify e2e` for real services | Dockerfile, compose, workflow, verification script, env contract, service wiring, MinIO, imgproxy, OIDC, or startup changed | To read logs, health endpoints, or external service behavior in the live stack |
| Frontend behavior | Vitest/component test or acceptance spec asserting the user-visible state transition | `./scripts/verify frontend`; add `./scripts/verify frontend-acceptance` for covered app journeys | The behavior depends on built frontend image, routing, auth, API-lite wiring, or browser-only behavior | To explore an uncovered UI path after adding feasible assertions |
| Visual behavior | Automated functional assertions plus inspected screenshot or visual artifact | Relevant unit/acceptance command for the behavior | The visual result depends on browser layout, real media, imgproxy, build output, or responsive rendering | Required for intentional visual/layout changes; screenshots complement assertions, they do not replace them |
| Full-stack wiring | Smoke through login and changed integration point against real compose stack | `./scripts/verify e2e` | API/app/imgproxy/OIDC/Postgres/MinIO compose wiring or production image interaction changed | To diagnose failures or inspect the changed path in the live stack |
| Application maintenance commands | Behavior tests for dry-run/apply/idempotency and real integration when persistence/storage/provider effects matter | `./scripts/verify backend`; add live command execution via `run` when needed | The command touches real persistence, storage, external providers, deploy-order behavior, or idempotency guarantees | To run dry-run/apply/dry-run in the live container and inspect resulting records or files |

When persistence matters, act, reload from the durable store, and assert again.

## Canonical commands

Run only through `./scripts/verify` unless diagnosing a failing canonical command:

```bash
./scripts/verify backend
./scripts/verify backend-acceptance
./scripts/verify frontend
./scripts/verify frontend-acceptance
./scripts/verify admin
./scripts/verify admin-acceptance
./scripts/verify e2e
./scripts/verify all
```

`docs/architecture/testing.md` documents what each suite covers. Do not duplicate
or bypass script internals here.

## Browser and live verification rules

- Use `run` when a live stack, logged-in browser, bearer token, real storage, or
  container command is needed. Use the URL/environment it returns.
- Prefer automated tests over manual Playwright driving. Do not use manual
  Playwright as the routine substitute for writing a test.
- For browser verification, attach listeners before acting: client console
  errors, page errors, and unexpected HTTP/network failures fail verification.
- Do not globally ignore imgproxy errors. Treat unexpected failures from any
  service as verification failures unless the scenario intentionally tests an
  error path.
- Visual changes require actual visual inspection at relevant viewports.
  Screenshots are evidence for appearance only after they are inspected; they
  do not replace functional assertions.
- Purely internal changes do not need image tests unless they affect a critical
  user journey or visible output.

## Verification result

End every verification report in this shape:

```markdown
## Verification result

### Behaviors verified
- ...

### Automated evidence
- Command:
- Tests:
- Result:

### Manual evidence
- ...

### Tests added or changed
- ...

### Unverified risks
- None
```

If `Unverified risks` is not `None`, state the missing evidence and continue
until it is resolved or explicitly blocked.
