# 1. Frontend testing strategy: three levels, node by default

## Status

Accepted — 2026-07-24

## Context

`app/` had no established convention for what kind of test to write for a given piece of
frontend code. The only tests in the repo before this decision were plain Vitest unit tests
against stores and utils (`useRecuerdosStore.test.ts`, `timeUtils.test.ts`), run under
`environment: 'node'` (`app/vitest.config.ts`). There was no `jsdom`, no React Testing
Library (RTL), and no documented guidance on when a component needs a real DOM to be
tested meaningfully versus when Playwright is the right (and much more expensive) tool.

This surfaced concretely while fixing a bug where `RecuerdoCard` navigation only worked in
one of two places it was duplicated (see the fix that introduced `RecuerdoFeedCard.tsx`).
The first version of its test called the component as a plain function and walked the
returned React element tree by hand, matching on ad hoc `data-testid` props — it worked,
but doesn't scale: it can't exercise real DOM behavior (event bubbling, `disabled` actually
blocking a click, accessible-name computation), and hand-rolled tree-walking is exactly the
kind of test infrastructure that should not be reinvented per file.

## Decision

Three levels, matched to what the code under test actually needs:

### Level 1 — Vitest, `environment: 'node'` (the default)

For logic that doesn't touch React or the DOM: pure functions, API mappers, formatters,
frontend domain rules, reducers, non-DOM services, HTTP adapters against mocks, date
calculations. This stays the **default** environment in `app/vitest.config.ts` because it's
the fast path and it's faithful enough for this category — most of the suite belongs here,
and it shouldn't pay jsdom's boot cost.

Examples already in the repo: `useRecuerdosStore.test.ts`, `timeUtils.test.ts`.

### Level 2 — Vitest + jsdom + React Testing Library

For components, hooks, and small compositions: does the chapter badge show, does a photo
replace it, is the avatar disabled, does a click call the right callback, does a form
validate, does a list react to a filter, does a modal appear, does a screen navigate
through a test router. Opt a file into this level with a `// @vitest-environment jsdom`
docblock at the very top of the test file — `environment` stays `'node'` globally so this
is per-file, not a blanket switch. `app/src/test/setup.ts` (wired via `setupFiles` in
`app/vitest.config.ts`) loads `@testing-library/jest-dom` matchers and calls
`cleanup()` after each test.

Query priority, in order: `getByRole`, `getByLabelText`, `getByPlaceholderText`,
`getByText`, `getByTestId`. `data-testid` is not banned, but it's the last resort for when
no reasonable semantic query exists (e.g. a bare decorative placeholder div with no role or
text). Prefer giving the element real accessible semantics over reaching for a test id —
concretely, this decision is why `RecuerdoFeedCard`'s avatar/photo buttons carry
`aria-label`s (`"Ver perfil de <nombre>"`, `"Ver foto"`) instead of `data-testid`s: it's
both a better test query and a real accessibility improvement for the same cost.

Reference implementation: `app/src/features/memories/components/RecuerdoFeedCard.test.tsx`.

### Level 3 — Playwright, real browser

For critical end-to-end journeys, run against Chromium/Firefox/WebKit for real: signup and
login, accepting an invite, creating the first baúl, creating a chapter, uploading a photo,
adding a recuerdo, navigating from a recuerdo to a persona, sharing or deleting content,
permission flows, basic responsive behavior. This is `/e2e-tests/` (repo root, full stack
smoke test) and `app/acceptance-tests/` (lighter stack, covers photo/persona/removal-
request flows) — see the `run` and `verify` skills for how to drive them.

Do **not** use Playwright to cover the six prop combinations of a single component like
`RecuerdoFeedCard` — that belongs at level 2. Playwright is reserved for journeys that
actually need a real browser and the real stack; using it for component-level branching is
slower to run and more expensive to maintain for no added coverage.

## Consequences

- New devDependencies in `app/package.json`: `jsdom`, `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event`.
- `app/vitest.config.ts` gained `setupFiles: ['./src/test/setup.ts']`; the default
  `environment` is unchanged (`'node'`), so existing level-1 tests are unaffected.
- Component tests must add the `// @vitest-environment jsdom` docblock explicitly — there is
  no automatic detection of "this test needs a DOM." Forgetting it fails fast (RTL's
  `render` throws immediately without a `document` global), so this is a cheap mistake to
  catch, not a silent one.
- Prefer adding an `aria-label`/role/text to a component over adding a `data-testid` when a
  test needs to target it — this couples test-writing to a small, ongoing accessibility
  improvement instead of an isolated test hook.
