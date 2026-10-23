---
name: update-changelog
description: "Reminds an agent to update CHANGELOG.md before committing a user-facing change. Use before every commit."
model: haiku
---

## Goal

Keep `CHANGELOG.md` an accurate, user-facing record — without noise.

## Before committing

1. Does this commit change what a user of the app can see or do (a feature,
   a fix, a behavior change, a removal, a security fix)?
   - **No** (tests, refactors, docs, CI, chores, internal tooling) → do nothing.
   - **Yes** → continue.
2. Add a bullet under `## [No publicado]` in `CHANGELOG.md`, in the matching
   [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) category
   (Añadido, Cambiado, Obsoleto, Eliminado, Arreglado, Seguridad). Create the
   category heading if it's missing.
3. Write the bullet in **Spanish**, in plain product language (no ticket IDs,
   internal names, or implementation detail) — the audience is end users.
4. Commit the changelog update together with the change.

When a patch tag is cut, `[No publicado]` gets renamed to that tag (with
today's date) and a fresh empty `[No publicado]` is added above it — do this
as part of the release, not as part of a feature commit.

## One file per minor series

`CHANGELOG.md` only holds the **current minor series** (`[No publicado]` plus
every tag of that series, newest first). Closed series live in
`CHANGELOG-X.Y.x.md` (e.g. `CHANGELOG-0.4.x.md`; `CHANGELOG-0.0.x.md` is the
alpha phase).

When cutting a new minor (e.g. `beta-v0.6.0`):

1. `git mv CHANGELOG.md CHANGELOG-0.5.x.md`, and change its title/intro to
   `Changelog 0.5.x` (copy the intro from any existing `CHANGELOG-X.Y.x.md`).
2. Create a fresh `CHANGELOG.md` (same header as before, intro mentioning
   `0.6.x`) with the `[No publicado]` content that goes into the new minor,
   renamed to `[beta-v0.6.0] - <date>`, and an empty `[No publicado]` above it.
   Anything unreleased that belongs to the previous series is released there first.
