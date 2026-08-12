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

When a new tag is cut, `[No publicado]` gets renamed to that tag (with
today's date) and a fresh empty `[No publicado]` is added above it — do this
as part of the release, not as part of a feature commit.

## Keep CHANGELOG.md short

`CHANGELOG.md` must only hold `[No publicado]` plus the **last 2 tagged
versions**. Older ones live in `CHANGELOG-ARCHIVE.md` (newest first there
too). When cutting a release pushes the file past 2 tagged versions, move the
oldest tagged section from `CHANGELOG.md` to the top of `CHANGELOG-ARCHIVE.md`
verbatim.
