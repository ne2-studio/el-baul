# Architecture Gap Scout

Architecture Gap Scout inspects a repository and returns a prioritized list of evidence-based refactoring initiatives.

It is deliberately read-only:

* it does not modify code;
* it does not implement refactors;
* it does not propose product features;
* it does not reward architectural fashion without repository evidence.

## Structure

* `SKILL.md`: runtime instructions for the agent.
* `criteria/`: independently extensible inspection criteria.
* `criteria/README.md`: instructions for authoring criteria.
* `templates/criterion.md`: starting point for a new criterion.

## Extending the skill

New recurring architectural pressures should normally be added as criteria, rather than by modifying the central skill.

Add or change `SKILL.md` only when the inspection workflow, prioritisation model, validity gate, or output contract changes.

## Design philosophy

The skill separates detection of architectural pressure from selection of a solution. A criterion should help the scout notice evidence in the repository; it should not force a pattern, framework, naming convention, or preferred implementation style.

Criteria should remain independent where possible. When two signals point to the same underlying pressure, prefer improving one criterion over creating overlapping criteria that produce duplicate initiatives.
