```yaml
id: encapsulation-violation
name: Domain decisions reconstructed outside their owner
attribute_improved:
  - domain explicitness
  - locality of change
  - correctness confidence
  - coupling
  - comprehensibility
signals:
  - Consumers inspect several fields of an object to determine whether an operation is valid.
  - Callers repeatedly retrieve internal state and perform decisions that conceptually belong to the represented domain concept.
  - Setters or mutable properties allow callers to create states that later code must defensively interpret.
  - Several callers must know the legal ordering of operations on the same concept.
  - A change to a domain rule would require finding consumers rather than changing one explicit decision point.
  - Callers coordinate multiple operations on an object to preserve an invariant.
  - Public data exposure is broader than the behaviour consumers legitimately need.
questions:
  - Are callers asking the object for data only to make a decision about that same object?
  - Which domain knowledge must every consumer understand before using this API safely?
  - Can callers construct or transition the concept into an invalid state?
  - Would a rule change require modifying consumers that should not own the rule?
  - Is the missing abstraction a domain decision rather than merely a convenience wrapper?
  - What is the smallest operation that could replace the exposed state and coordination?
invalid_recommendations:
  - Move every conditional into an entity regardless of ownership.
  - Hide data merely to reduce the number of public properties.
  - Replace simple data structures with rich domain objects without behavioural pressure.
  - Introduce getters and forwarding methods that preserve the same leaked knowledge.
  - Encapsulate technology-specific orchestration inside domain objects.
  - Recommend an anemic-domain-model refactor solely as a general DDD preference.
possible_measurements:
  - Number of callers reconstructing the same or related decisions.
  - Number of public fields or methods required to perform one meaningful operation.
  - Number of files affected by a representative rule change.
  - Number of invalid states constructible through the public API.
  - Number of call sites coordinating operation ordering.
  - Reduction in consumer-side branching after the refactor.
```

The signal is not merely that callers access data — most objects expose some state, and that alone is not a violation. The criterion applies when callers use exposed state to reconstruct knowledge about what the concept means, which operations are valid, or how its invariants must be preserved. A single occurrence can still qualify: the evidence is the reconstructed decision, not repetition of it.

The remedy is the smallest responsibility that removes the reconstruction, not a prescribed location. Depending on the evidence, this may surface as behaviour on the entity itself, a value object, a policy, a domain service, or an operation at the aggregate or module boundary. Do not default to "move it onto the entity" — identify the missing responsibility first, then let its owner fall out of what the decision actually depends on.
