# Admin backoffice instructions

Read `../docs/architecture/admin.md` before changing backoffice structure or auth gating.

Read `../docs/architecture/frontend.md` for the shared layering pattern this service follows.

Read `../docs/PRODUCT.md` before changing product copy, domain language, user flows, or
operator-facing representations of product concepts.

Read `../docs/DESIGN.md` before making visual changes.

## Before finishing a task

Use the `verify` skill to choose the smallest evidence set that covers the risks in the diff.
Run the relevant canonical `./scripts/verify ...` command from the repo root and fix all
issues found. Verification MUST succeed to consider the task done.
