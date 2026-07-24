```yaml
id: excessive-coupling
name: Reduce unstable or unnecessary coupling
attribute_improved:
  - changeability
  - locality of change
  - modularity
  - cognitive load
signals:
  - A change repeatedly touches unrelated modules.
  - High-level concepts depend directly on volatile infrastructure.
  - Circular dependencies exist.
  - Shared modules import feature-specific concepts.
  - A component exposes internal implementation details.
questions:
  - Which changes are made harder by this dependency?
  - Is the dependency stable or volatile?
  - Do the coupled parts change together or independently?
invalid_recommendations:
  - Decoupling components that always evolve together.
  - Adding interfaces without reducing a concrete change cost.
  - Replacing direct calls with indirection that preserves the same coupling.
possible_measurements:
  - Dependency edges removed.
  - Number of modules affected by representative changes.
  - Cycles eliminated.
  - Public surface reduced.
```
