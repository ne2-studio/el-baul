```yaml
id: test-descent-opportunity
name: Descend combinatorial behaviour to a smaller component
attribute_improved:
  - test feedback speed
  - diagnostic quality
  - behavioural coverage
  - comprehensibility
signals:
  - Many acceptance tests vary only a small set of business inputs.
  - Test setup is much larger than the assertion.
  - Infrastructure is required to exercise a pure decision.
  - External tests are slow because they cover a combinatorial matrix.
  - Failures report generic transport or server errors instead of the broken rule.
questions:
  - What is the exact axis of variation?
  - Can the decision be expressed with semantic inputs and outputs?
  - Which outer tests must remain to protect wiring?
invalid_recommendations:
  - Extracting arbitrary classes solely to make them mockable.
  - Replacing all acceptance tests with unit tests.
  - Simulating infrastructure whose semantics are essential to the behaviour.
possible_measurements:
  - Acceptance scenarios removed or consolidated.
  - Focused cases added.
  - Suite runtime before and after.
  - Reduction in repeated setup.
  - Improvement in failure localisation.
```

A valid descent initiative must name:

* the decision to extract;
* the cases to move;
* the black-box paths to retain.
