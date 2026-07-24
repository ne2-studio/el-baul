```yaml
id: mixed-decisions-and-effects
name: Separate business decisions from external effects
attribute_improved:
  - testability
  - cohesion
  - diagnostic quality
  - comprehensibility
signals:
  - A method decides, persists, publishes, logs, and renders.
  - Business rules depend directly on EF Core, HTTP, filesystem, or framework types.
  - Testing one rule requires configuring unrelated infrastructure.
  - Error handling obscures the underlying decision.
questions:
  - Is there a meaningful decision that can exist independently?
  - Are the effects genuinely external or merely internal calls?
  - Would extraction improve combinatorial testing?
invalid_recommendations:
  - Introducing ports around every dependency.
  - Separating code that always changes together.
  - Creating pass-through application services.
possible_measurements:
  - Number of external dependencies needed to test the decision.
  - Number of responsibilities in the original unit.
  - Number of business cases testable without infrastructure.
```
