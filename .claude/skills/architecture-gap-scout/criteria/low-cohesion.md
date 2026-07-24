```yaml
id: low-cohesion
name: Increase cohesion
attribute_improved:
  - comprehensibility
  - locality of change
  - testability
signals:
  - A module changes for unrelated reasons.
  - A class has several independent groups of dependencies.
  - Different subsets of methods operate on unrelated state.
  - A file has accumulated unrelated feature logic.
questions:
  - What independent responsibilities exist?
  - Do they have distinct reasons to change?
  - Is there a natural boundary already visible in tests or history?
invalid_recommendations:
  - Splitting only because a file is long.
  - Creating one class per method.
  - Separating tightly coupled invariants.
possible_measurements:
  - Independent responsibilities separated.
  - Dependency count per extracted component.
  - Reduction in unrelated co-change.
```
