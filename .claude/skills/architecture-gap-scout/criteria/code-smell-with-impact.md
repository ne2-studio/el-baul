```yaml
id: code-smell-with-impact
name: Remove code smells that create demonstrated cost
attribute_improved:
  - comprehensibility
  - changeability
  - reliability
signals:
  - Deep conditional nesting.
  - Long parameter lists representing an implicit concept.
  - Feature envy.
  - Shotgun surgery.
  - Divergent change.
  - Primitive obsession.
  - Boolean flags controlling unrelated paths.
  - Comments explaining convoluted mechanics.
questions:
  - What real change or defect does the smell make harder?
  - Is the smell repeated or isolated?
  - Is there evidence from history, tests, or defects?
invalid_recommendations:
  - Reporting smells solely from static thresholds.
  - Treating every long method as a refactoring priority.
  - Applying textbook refactors without contextual benefit.
possible_measurements:
  - Branch complexity reduced.
  - Parameters replaced by a meaningful concept.
  - Files touched for representative changes.
```

A smell is supporting evidence, not sufficient justification by itself.
