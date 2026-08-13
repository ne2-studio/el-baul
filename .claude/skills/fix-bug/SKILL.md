---
name: fix-bug
description: "Reproduces a reported bug, captures it with a failing regression test, fixes it, and verifies the original scenario."
disable-model-invocation: true
---

## Goal

Fix bugs with reproducible evidence.

A bug is fixed only when:

1. The incorrect behavior was reproduced.
2. A regression test failed before the fix.
3. The same test passed after the fix.
4. The original scenario passed when repeated manually.

## Workflow

### 1. Reproduce

Use the repository's `run` skill to start the appropriate environment.

Document:

* Preconditions
* Exact steps
* Observed behavior
* Expected behavior
* Reproduction status: `reproduced`, `partial`, or `not reproduced`

Do not infer a cause before reproducing the behavior.

This step must remain independently executable so it can later be delegated to another agent.

### 2. Capture the regression

Follow the repository's [testing strategy](/docs/architecture/testing.md).

Write the cheapest stable test that:

* Fails because of the reported behavior
* Asserts observable behavior, not implementation details
* Protects against regression

Start at the boundary where the bug is observable. Descend only when the broader test would be slow, fragile, or unnecessarily complex.

Run the test before changing production code. Record the failure.

If the test passes, it does not capture the bug.

### 3. Fix

Find the root cause and make the smallest safe change.

Avoid unrelated refactors.

Run the regression test until it passes. Then run the relevant verification defined by the repository's `verify` skill.

### 4. Verify manually

Repeat the original reproduction steps against the fixed version.

Confirm:

* The observed behavior now matches the expected behavior
* No related errors appear in the UI, console, network, or logs

Do not replace this step with automated tests.

## Report

```text
Reproduction
- Status:
- Preconditions:
- Steps:
- Observed:
- Expected:

Regression test
- Test:
- Level:
- Before fix:
- After fix:

Root cause
- ...

Fix
- ...

Verification
- Automated:
- Manual:
```

## Constraints

* Do not claim the bug is fixed without both red-green test evidence and successful manual verification.
* If reproduction or regression testing is impossible, report the limitation explicitly.
* Do not modify unrelated behavior.
