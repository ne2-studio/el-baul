# Backlog tooling

Internal dev-workflow automation, not part of the deployable product — no runtime code here
depends on it, and it isn't deployed with `api/`, `app/`, or `admin/`.

* `./scripts/backlog` — queues GitHub issues (label `backlog`) and runs each one unattended
  through the `work-ticket` skill: implement, verify, commit, push, comment the result back on
  the issue. See `./scripts/backlog --help`.
* `./scripts/gap-scout` — runs the `find-architecture-gaps` skill periodically over `app/` or
  `api/` via the `architecture-gap-scout` agent, dedupes against previously filed initiatives,
  and files new ones as GitHub issues (label `gap-scout`) pending approval. See
  [`gap-scout.md`](gap-scout.md) for how to schedule it and how approval works.

## Approval flow

`gap-scout` never queues its own findings for execution — it only proposes. Approving an
initiative means adding the `backlog` label to its issue by hand; that hands it to
`./scripts/backlog`'s existing worker, same as any manually-filed ticket. Leaving an issue
unlabeled (or closing it) means "not now" — it won't be re-filed verbatim on the next scan.
