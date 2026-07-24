```yaml
id: architecture-documentation-drift
name: Divergence from documented architecture decisions
attribute_improved:
  - consistency
  - comprehensibility
  - correctness confidence
  - changeability
signals:
  - Code crosses a boundary the architecture document states as a rule (e.g. "controllers depend only on Ports/Input", "the two images share the HTTP pipeline").
  - Code contradicts a decision recorded in an ADR under docs/adr/ or <app>/docs/adr/ that no later ADR has superseded.
  - A documented invariant (e.g. "photos are never hard-deleted by anyone but the custodian") has a code path that appears to break it.
  - An ADR's stated consequence or constraint no longer matches what the code does, with no superseding ADR and no note explaining the divergence.
  - The architecture document or an ADR describes a component, layer, or flow that no longer exists, or omits one that now carries real responsibility.
questions:
  - Does the documentation state a binding rule or invariant, or is it descriptive/aspirational prose with no real force?
  - Is the divergence already explained — a later ADR, an inline comment, a CHANGELOG entry — or does it look like unnoticed drift?
  - Is this a one-off exception or a systemic pattern affecting multiple call sites?
  - Has the code legitimately evolved for a good reason, making the documentation the stale side rather than the code?
invalid_recommendations:
  - Flagging a gap because the documentation is silent on a case — silence is not a violation.
  - Forcing code back in line with a document without checking whether the document is the side that's actually stale.
  - Proposing a new ADR for a decision that involved no real trade-off.
  - Treating stylistic or naming differences between docs and code as drift when the underlying rule still holds.
possible_measurements:
  - Count of call sites violating a stated boundary, before and after.
  - Number of documented invariants that have automated protection (a test, an architecture/static-analysis check) versus none.
  - Number of ADRs whose stated consequences no longer match the code, before and after.
```

Read the repository's architecture documentation before evaluating this criterion: the root-level architecture document (e.g. `ARCHITECTURE.md`), plus every ADR under `docs/adr/` and under `<app>/docs/adr/` for each deployable application in the repo (one such directory per app, e.g. `api/docs/adr/`, `app/docs/adr/`, `admin/docs/adr/`). Treat a stated rule, invariant, or diagram in these documents as ground truth to check the code against — not as background reading. If none of these locations exist yet, or exist but contain nothing binding, skip this criterion; there is nothing documented to diverge from.

Only report a violation when the documentation asserts something with actual force — a "never"/"always"/"must" statement, an explicit boundary ("X depends only on Y"), a layering diagram, a stated invariant — not from silence on a case the docs never addressed, and not from language that reads as aspirational rather than descriptive of what's actually enforced.

When code and documentation disagree, determine which side is stale before recommending a fix. If the code changed for a good reason and the documentation simply wasn't updated, the correct initiative is to update the documentation, not to bend the code back into shape — report that as a valid initiative under this criterion, since a stale architecture doc or ADR misleads every future contributor and quietly erodes comprehensibility and correctness confidence just as much as code drift does. Cite the exact document section alongside the violating (or superseding) code location so both sides of the evidence are visible.
