# Criteria catalogue

Each file in this directory describes one recurring architectural pressure.

The scout reads every `*.md` file in this directory except this README.

## Adding a criterion

1. Copy `../templates/criterion.md`.
2. Name the file after the criterion ID: `criteria/<id>.md`.
3. Describe an observable pressure, not a preferred solution.
4. Include signals that can be demonstrated from repository evidence.
5. Include false positives and invalid recommendations.
6. Define measurements that could validate an improvement.

## Criterion schema

Each criterion starts with a fenced YAML block:

```yaml
id:
name:
attribute_improved:
signals:
questions:
invalid_recommendations:
possible_measurements:
```

Optional prose may follow the block to clarify applicability and false positives.

## Design rules

A criterion should be:

* recurring across codebases;
* detectable from repository evidence;
* independent from a particular pattern or implementation;
* capable of producing a measurable improvement;
* distinct from existing criteria.

Good criterion:

> Repeated permission rules are interpreted differently across endpoints.

Bad criterion:

> Use the specification pattern.

The first describes pressure. The second prescribes a solution.

## Separation rule

Use this test when deciding where content belongs:

> Does this sentence change how the agent should behave during this execution?

If yes, it belongs in `SKILL.md`.

If it explains how to maintain, extend, or understand the skill, it belongs in `README.md`.

If it explains how to write criteria, it belongs in this file.

If it is operational criterion content, it belongs in `criteria/<id>.md`.
