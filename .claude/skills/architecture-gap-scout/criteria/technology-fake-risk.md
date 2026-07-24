```yaml
id: technology-fake-risk
name: Replace misleading infrastructure fakes with realistic tests
attribute_improved:
  - correctness confidence
  - integration reliability
signals:
  - An in-memory fake attempts to reproduce database semantics.
  - Concurrency, transactions, constraints, collation, or precision matter.
  - A mocked external protocol hides serialization or configuration failures.
  - Production failures occurred despite green fake-based tests.
questions:
  - Which real semantics are not represented by the fake?
  - Can an ephemeral real dependency be used?
  - Is the fake still valuable for orchestration tests?
invalid_recommendations:
  - Replacing simple deterministic fakes such as clocks.
  - Using real third-party production services in CI.
possible_measurements:
  - Relevant adapter tests using real ephemeral infrastructure.
  - Production-only failure modes reproduced in tests.
```
