```yaml
id: unclear-naming
name: Improve names and conceptual clarity
attribute_improved:
  - comprehensibility
  - cognitive load
  - domain explicitness
signals:
  - Generic names such as Manager, Helper, Service, Processor, Data, Info, Utils.
  - The same concept has several names.
  - One name refers to several different concepts.
  - Comments are required to explain what a type actually represents.
  - Method names describe mechanics instead of intent.
questions:
  - What concept is currently hidden?
  - Is the confusion local or systemic?
  - Does terminology match product language?
invalid_recommendations:
  - Renaming based only on personal style.
  - Replacing one vague synonym with another.
possible_measurements:
  - Number of competing terms removed.
  - Reduction in explanatory comments.
  - Reduction in ambiguous public members.
```

Prefer initiatives that align code terminology with the language used in product requirements and user-facing behaviour.
