```yaml
id: missing-operational-boundary
name: Improve operational visibility and recoverability
attribute_improved:
  - reliability
  - operational visibility
  - diagnostic quality
signals:
  - Important background work cannot be observed.
  - Failures are swallowed or logged without context.
  - No metric distinguishes success, retry, and permanent failure.
  - Critical flows lack correlation identifiers.
  - Health checks do not represent real readiness.
questions:
  - How would operators know this capability is failing?
  - Can failures be diagnosed without reproducing them locally?
  - Is the proposed instrumentation tied to an actionable decision?
invalid_recommendations:
  - Adding logs everywhere.
  - Reporting observability work without an operational use case.
possible_measurements:
  - Previously invisible failure modes exposed.
  - Actionable metrics or structured events added.
  - Mean time to diagnose reduced.
```
