---
name: gap-scout-runner
description: "Runs architecture-gap-scout over a given scope, dedupes against previously reported initiatives, and files new ones as GitHub issues pending approval. Driven by ./scripts/gap-scout, not for direct end-user requests."
disable-model-invocation: true
---

## Goal

Produce fresh, non-duplicate architecture initiatives for the scope given in the prompt,
filed as GitHub issues labeled `gap-scout` for Pedro to review. This skill runs in its own
tmux window, dispatched by `./scripts/gap-scout scan`, with no prior context — everything
needed comes from the prompt and the repository itself. It's usually unattended, but a
permission prompt it can't resolve pauses in that window rather than failing silently —
Pedro may answer it directly.

Filing an issue is the end of this skill's responsibility. It never approves its own
findings: approval is Pedro adding the `backlog` label by hand, which hands the issue to
`./scripts/backlog`'s existing worker. This skill must never add that label itself.

## Workflow

### 1. Determine scope

The prompt states the scope, e.g. `Scope: app/` or `Scope: api/`. Constrain the
inspection to that directory. Root-level docs (`ARCHITECTURE.md`, ADRs) are still fair
game for context, per the scout's own Step 1 — only the evidence and the reported
initiatives must stay inside the scope.

### 2. Gather previously reported initiatives

```bash
gh issue list --label gap-scout --state all --json number,title,body \
  --jq '.[] | "#\(.number) \(.title)\n\(.body)\n---"'
```

Read each one's **Type** and **Affected area** fields (from `output-template.md`'s
shape), not just the title — titles get reworded across runs more easily than the
underlying smell and affected files do. Include closed/dismissed issues: if Pedro closed
one without approving it, that's a signal not to re-propose it verbatim, not an invitation
to retry.

### 3. Run the scout

Invoke `/architecture-gap-scout`, treating its scope as the directory from step 1. Follow
its own process and validity gate in full. Then, before filing anything, drop any
candidate that names essentially the same smell + affected area as an issue from step 2
— open or closed. When in doubt whether two initiatives are the same underlying gap,
treat them as duplicates rather than filing a near-identical issue.

### 4. File new initiatives

For each surviving initiative, one GitHub issue:

```bash
gh issue create --label gap-scout --title "<initiative title>" --body "<initiative, in output-template.md's exact format>"
```

Do not add the `backlog` label. Do not close, edit, or comment on any existing issue —
this skill only ever adds new `gap-scout` issues.

### 5. Report

Final message: the issues filed (numbers + titles), and briefly which candidates were
skipped as duplicates of an existing issue (with its number).

## Constraints

- Never modify code, never touch git.
- Never add the `backlog` label or otherwise self-approve a finding.
- Never edit, close, or comment on an existing issue.
- If nothing passes the validity gate, or everything is a duplicate, file no issues —
  say so plainly rather than forcing a report.
