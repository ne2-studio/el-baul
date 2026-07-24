```yaml
id: implicit-domain-concept
name: Make domain concepts explicit
attribute_improved:
  - domain explicitness
  - cohesion
  - correctness confidence
  - comprehensibility
signals:
  - A business decision is spread across conditionals.
  - Primitive values repeatedly travel together.
  - Several methods interpret the same flags or status combinations.
  - Important invariants are enforced only by convention.
  - A concept appears repeatedly in tests but has no representation in production code.
questions:
  - Does the concept have rules, identity, lifecycle, or invariants?
  - Would naming it reduce duplicated interpretation?
  - Can it be expressed without infrastructure concerns?
invalid_recommendations:
  - Creating domain objects for passive data with no behaviour.
  - Wrapping every primitive without a concrete invariant.
  - Building a complete domain layer for CRUD behaviour.
possible_measurements:
  - Number of scattered conditionals centralised.
  - Number of invalid states made unrepresentable.
  - Number of callers using the explicit concept.
```

A domain abstraction is justified when it captures knowledge, not merely data.
