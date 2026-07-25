```yaml
id: excessive-module-surface
name: Excessive consumer knowledge for provided capability
attribute_improved:
  - comprehensibility
  - coupling
  - locality of change
  - changeability
  - deletion of accidental complexity
  - reduction of cognitive load
signals:
  - Consumers must coordinate several public collaborators to perform one cohesive capability.
  - A module exposes many types, interfaces, methods, configuration options, or lifecycle steps relative to the behaviour it provides.
  - Callers must understand internal sequencing, intermediate states, or implementation concepts.
  - Many public abstractions are forwarding layers with little hidden complexity.
  - A representative feature requires reading many files before the module's contract can be understood.
  - Similar callers repeat orchestration because no stable capability-level entry point exists.
  - Internal implementation changes repeatedly force modifications in consumers.
  - Public APIs expose technology or persistence concepts that are not meaningful to the caller.
  - Multiple interfaces divide one cohesive responsibility without allowing meaningful independent use or variation.
  - Tests require constructing a large object graph to exercise a small capability.
questions:
  - What does a consumer need to know to obtain one meaningful result?
  - How many public concepts must be understood before the module can be used safely?
  - Which exposed concepts represent real caller needs, and which reveal internal decomposition?
  - Does the module hide substantially more complexity than it exposes?
  - Could one capability-oriented operation replace repeated consumer orchestration?
  - Can internal implementation change without altering callers?
  - Are the exposed interfaces independently valuable boundaries or merely fragments of one workflow?
  - How many files must a maintainer inspect to understand the module's public behaviour?
invalid_recommendations:
  - Add a facade solely to reduce the visible number of classes while preserving the same consumer knowledge.
  - Merge modules merely because fewer files appear simpler.
  - Hide independently useful capabilities behind a god service.
  - Prefer fewer methods when several explicit operations represent genuinely different behaviours.
  - Collapse boundaries that vary, deploy, fail, or are tested independently.
  - Treat every interface as accidental complexity.
  - Recommend deep modules without identifying what complexity would be hidden.
possible_measurements:
  - Public methods, types, interfaces, and configuration concepts per capability.
  - Number of collaborators a consumer must coordinate for a representative use case.
  - Number of files inspected to understand or change a representative behaviour.
  - Number of consumer-side orchestration steps.
  - Number of public API changes caused by an internal implementation change.
  - Object graph size required in focused tests.
  - Reduction in exposed types or required consumer decisions.
  - Reduction in repeated orchestration across callers.
```

Evaluate module depth as hidden useful complexity divided by exposed cognitive surface, in the sense of Ousterhout's deep modules — not as a strict formula, but as the mental model to apply. A module is not shallow merely because it spans several files or interfaces; it is shallow when the ratio of knowledge a consumer must hold to the capability actually delivered is high. A facade that still requires callers to understand the same internal collaborators, sequencing, or intermediate state has not reduced the surface — it has only renamed it.

A narrow facade over a stable, rarely-changing area can still be a valid initiative: the gain is not making the internals easier to change, it is letting the rest of the codebase stop needing to load them mentally.
