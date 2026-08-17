# Backlog tooling

Internal dev-workflow automation, not part of the deployable product — no runtime code here
depends on it, and it isn't deployed with `api/`, `app/`, or `admin/`.

* `./scripts/backlog` — queues GitHub issues (label `backlog`) and runs each one that's also
  labeled `refined` unattended through the `work-ticket` skill: delegate implementation,
  verify, commit, push, comment the result back on the issue. See `./scripts/backlog --help`.
* `refine-backlog` (Claude Code skill, run interactively as `/refine-backlog`) — walks every
  queued ticket that isn't yet `refined`, one at a time, spawning a `refiner` agent that asks
  Pedro directly to resolve ambiguity before the ticket is safe to hand to unattended
  implementation. This is the only place in the pipeline where clarifying questions are asked
  live — `work-ticket` never asks anything; a ticket that turns out ambiguous during
  implementation is reported `blocked` instead, to go back through refinement.
* `./scripts/gap-scout` — runs the `find-architecture-gaps` skill periodically over `app/` or
  `api/` via the `architecture-gap-scout` agent, dedupes against previously filed initiatives,
  and files new ones as GitHub issues (label `gap-scout`) pending approval. See
  [`gap-scout.md`](gap-scout.md) for how to schedule it and how approval works.

## Approval flow

`gap-scout` never queues its own findings for execution — it only proposes. Approving an
initiative means adding the `backlog` label to its issue by hand; that queues it, same as any
manually-filed ticket — it still needs a `refine-backlog` pass (label `refined`) before
`./scripts/backlog`'s worker will pick it up. Leaving an issue unlabeled (or closing it) means
"not now" — it won't be re-filed verbatim on the next scan.
