---
name: work-ticket
description: "Implements a single backlog ticket autonomously end-to-end, signaling completion for the backlog orchestrator."
disable-model-invocation: true
---

## Goal

Take the ticket supplied in the prompt, implement it, verify it, get it committed and
pushed to `main`, and hand control back to `./scripts/backlog`'s orchestrator. This skill
runs unattended (via `./scripts/backlog run`) inside a fresh session with no prior
context — everything needed must come from the ticket text and the repository itself.

## Workflow

### 1. Understand the ticket

Read the ticket text given in the prompt. It may be terse. Inspect the codebase, the
relevant `docs/` files referenced by root/service `CLAUDE.md`, and existing code before
assuming intent.

If the ticket is genuinely ambiguous or contradictory in a way that materially affects
product behavior, scope, or architecture, and cannot be reasonably inferred from the
codebase, ask a single clear question and wait. Remote Control forwards it to Pedro's
phone. Do not ask about implementation details you can reasonably decide yourself.

If the ticket body contains image URLs (e.g. `![...](https://github.com/user-attachments/...)`
or other GitHub-hosted image links), download each one and view it before proceeding —
the ticket text alone may not convey what a screenshot shows:
```bash
mkdir -p /tmp/work-ticket-images && curl -sL "<url>" -o /tmp/work-ticket-images/<n>.png
```
Then `Read` the downloaded file. If a download fails (private attachment, expired URL),
note it and continue with the text you do have rather than blocking on it.

### 2. Implement

Make the change. Follow the repository's architecture and API conventions. Keep the
change scoped to the ticket; do not bundle unrelated refactors.

Update `CHANGELOG.md` per the `update-changelog` skill if the change is user-facing.

### 3. Verify

Use the `verify` skill to select and run the smallest evidence set that covers the
diff's risks, per the repository's canonical `./scripts/verify ...` commands. Fix all
issues found. This must succeed — do not proceed to commit on red or partial evidence.

If a real environment is required, use the `run` skill first.

### 4. Commit and push

`git commit` and `git push` are not in this repository's permission allow-list, so
attempting them will pause for approval — that pause is the approval gate, forwarded to
Pedro's phone via Remote Control. Do not try to work around it or batch it with an
allow-listed command.

Before committing, summarize for Pedro: what changed, why, and the verification
evidence (mirroring the `verify` skill's report shape). Then run the commit and push.

If Pedro rejects or requests changes, address them and repeat this step. Never leave
`main` in a state where the working tree has verified-but-uncommitted changes when you
finish the turn — either it's committed and pushed, or you've signaled `blocked` (step
6) explaining why.

### 5. Report back to the issue

The ticket's GitHub issue number is given in the prompt (`GitHub issue: #<n> (<url>)`).
Post your final feedback message there as a comment, so the outcome is visible on the
issue itself, not just in a session Pedro may never open:

```bash
gh issue comment <n> --body "<final feedback message>"
```

- On success: the same summary you gave Pedro before committing (what changed, why,
  verification evidence), plus the commit SHA(s).
- If blocked: the explanation of why, exactly as given in your final message.

Post this before signaling completion (step 6). If the comment fails to post (network,
permissions), don't let that block the signal — note it and move on.

### 6. Signal completion

This is the last thing you do, and only after the turn's final message. The orchestrator
cannot tell you're done any other way — a session cannot end itself.

- On success (committed and pushed):
  ```bash
  mkdir -p .backlog && printf 'status=done\n' > .backlog/.signal
  ```
- If genuinely blocked (contradictory requirements after asking, verification cannot be
  made to pass, ticket describes something out of scope for this repo, etc.) — explain
  why in your final message, then:
  ```bash
  mkdir -p .backlog && printf 'status=blocked\nreason=%s\n' "<short reason>" > .backlog/.signal
  ```

Do not write the signal file until the work is actually committed+pushed or you have
truly given up — writing it ends the session.

## Constraints

- Never push directly bypassing the approval prompt.
- Never fabricate verification results; if a risk is unverified, that's `blocked`, not
  `done`.
- One ticket, one session, one commit (or a small number of logically-related commits)
  — don't carry work into a follow-up turn expecting more context; there won't be any.
