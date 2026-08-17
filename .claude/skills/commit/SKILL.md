---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git branch:*), Bash(git log:*), Bash(git commit:*)
description: "How commits should be prepared and created in this repository: staging, message conventions, and scope."
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Message conventions

- Conventional Commits format: `type(scope): description` — `scope` optional, omit
  when the change doesn't map to one clear area.
- `type` in English (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`...).
- Description in **English**, plain and specific about what changed, not why the task
  was asked.
- Keep unrelated changes out of one commit — stage only what belongs to the logical
  change being committed, not everything in `git status`.

## Before committing

If the change is user-facing, it needs a `CHANGELOG.md` entry first — see the
`update-changelog` skill. Don't commit a user-facing change without it.

## Your task

Based on the change being committed (not necessarily everything `git status` shows),
stage the relevant files and create a single commit with a message following the
conventions above.

This skill only creates the commit. Pushing — and any approval gate around it — is the
caller's decision, not this skill's.
