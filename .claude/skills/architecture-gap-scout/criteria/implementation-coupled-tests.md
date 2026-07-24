```yaml
id: implementation-coupled-tests
name: Reduce test coupling to implementation
attribute_improved:
  - refactorability
  - correctness confidence
  - test stability
signals:
  - Tests assert collaborator call sequences.
  - Tests break on internal reorganisation without behavioural change.
  - Mocks reproduce production logic.
  - Tests replace most of the production bootstrap.
  - Acceptance tests reference internal projects or types.
questions:
  - What behaviour is the test actually trying to protect?
  - Can it be observed through a stable boundary?
  - Is the interaction itself part of the contract?
invalid_recommendations:
  - Removing all mocks regardless of context.
  - Converting every test into a full end-to-end test.
possible_measurements:
  - Number of interaction assertions replaced by outcome assertions.
  - Number of production internals referenced by tests.
  - Number of tests surviving a behaviour-preserving refactor.
```
