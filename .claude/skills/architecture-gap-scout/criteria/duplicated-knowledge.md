```yaml
id: duplicated-knowledge
name: Eliminate duplicated knowledge
attribute_improved:
  - consistency
  - correctness confidence
  - locality of change
  - changeability
signals:
  - The same business rule appears in multiple places.
  - Similar conditionals evolve independently.
  - Multiple tests encode the same rule using different terminology.
  - A change requires editing several unrelated files.
questions:
  - Is this textual duplication or duplicated knowledge?
  - Could one copy legitimately vary independently?
  - Have the duplicated areas changed together?
invalid_recommendations:
  - Extracting code only because two fragments look similar.
  - Creating a generic abstraction before the concepts are proven equivalent.
possible_measurements:
  - Number of rule implementations before and after.
  - Number of files required for a representative change.
  - Number of inconsistent branches removed.
```

Report textual duplication only when it creates a demonstrated maintenance cost.

Prefer duplicated knowledge over superficial similarity.
