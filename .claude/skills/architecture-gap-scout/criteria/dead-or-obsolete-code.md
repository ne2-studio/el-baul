```yaml
id: dead-or-obsolete-code
name: Remove dead or obsolete code
attribute_improved:
  - cognitive load
  - security
  - changeability
  - maintenance cost
signals:
  - Unused public or internal members.
  - Feature flags permanently enabled or disabled.
  - Deprecated paths with no consumers.
  - Duplicate implementations where one is no longer reachable.
  - Compatibility code for unsupported versions.
questions:
  - Is the code provably unused?
  - Could reflection, serialization, routing, or external consumers use it?
  - Is deletion behaviour-preserving?
invalid_recommendations:
  - Deleting code based only on local reference search.
  - Removing public APIs without compatibility analysis.
possible_measurements:
  - Lines, dependencies, endpoints, or flags removed.
  - Public surface reduced.
```
