# Backend instructions

Read `../docs/architecture/backend.md` before changing project boundaries, application
boundaries, persistence, or infrastructure adapters.

Read `../docs/API-CONVENTIONS.md` before changing API authentication, authorization, or
observable error semantics.

## Before finishing a task

- Use the `verify` skill to choose the smallest evidence set that covers the risks in the diff.
- Run the relevant canonical `./scripts/verify ...` command from the repo root and fix all
  issues found. Verification MUST succeed to consider the task done.
- If the task requires manual verification, use the `run` skill first.
