```yaml
id: insufficient-behavioural-coverage
name: Increase confidence in important behaviour
attribute_improved:
  - correctness confidence
  - behavioural coverage
  - regression detection
signals:
  - A public capability has no black-box protection.
  - Tests cover collaborators but not observable outcomes.
  - Critical branches have only implementation-coupled tests.
  - Production incidents occurred in untested behaviour.
  - Error, retry, concurrency, or recovery paths are unprotected.
questions:
  - What user-visible or operational capability is at risk?
  - Which boundary provides the strongest realistic evidence?
  - Is missing line coverage actually relevant?
invalid_recommendations:
  - Increasing coverage percentages without identifying behaviour.
  - Adding tests for trivial getters or framework code.
  - Duplicating existing evidence at another level.
possible_measurements:
  - Capabilities with acceptance coverage before and after.
  - Mutation score for critical logic.
  - Number of important failure paths protected.
```

Prioritise confidence in important behaviour over global percentage targets.
