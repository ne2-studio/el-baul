# Consumer app instructions

Read `../docs/architecture/frontend.md` before changing feature boundaries, state management,
routing, or the design-system boundary.

Read `../docs/architecture/native-android.md` before changing `android/`, Capacitor plugins,
deep links, or native sharing.

Read `../docs/PRODUCT.md` before changing product copy, domain language, user flows, or AI
affordances.

Read `../docs/DESIGN.md` before making visual changes.

## Before finishing a task

Use the `verify` skill to choose the smallest evidence set that covers the risks in the diff.
Run the relevant canonical `./scripts/verify ...` command from the repo root and fix all
issues found. Verification MUST succeed to consider the task done.
