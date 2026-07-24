---
name: architecture-gap-scout
description: "Inspect a codebase for architecture, design, testing, and maintainability gaps. Produce a prioritized list of evidence-based refactoring initiatives. Do not modify code, create plans for features, or implement refactors."
---

# Architecture Gap Scout

## Purpose

Inspect the current codebase and identify the highest-value opportunities to improve its architecture, design, testability, clarity, and long-term capacity for change.

The output is a prioritized list of refactoring initiatives supported by concrete evidence from the repository.

This skill does not implement changes, propose speculative architecture, or recommend patterns merely because they are considered good practice.

Every reported initiative must demonstrate that the proposed change would objectively improve at least one relevant attribute of the codebase.

---

# Core principles

## 1. Evidence before recommendation

Do not report a gap without repository evidence.

Valid evidence includes:

* repeated code or repeated test setup;
* files, methods, components, or modules that change together;
* duplicated domain rules;
* concepts represented only implicitly;
* confusing or inconsistent terminology;
* tests that cannot detect meaningful regressions;
* public behaviour lacking acceptance coverage;
* excessive dependencies;
* mixed responsibilities;
* unstable boundaries;
* dead or unreachable code;
* repeated production defects;
* comments compensating for unclear design;
* tests coupled to implementation details;
* slow or combinatorial acceptance tests;
* infrastructure leaking into domain decisions;
* frequent modifications to the same fragile area;
* configuration or behaviour duplicated across multiple locations.

Do not rely only on generic statements such as "this violates SOLID", "this should use a repository", "this class is too large", "this should follow hexagonal architecture", "this would be cleaner", or "this is not best practice". Explain the concrete cost currently caused by the observed structure.

## 2. Improve attributes, not aesthetics

Every initiative must improve one or more explicit attributes:

* correctness confidence;
* behavioural coverage;
* changeability;
* comprehensibility;
* cohesion;
* coupling;
* locality of change;
* test feedback speed;
* test diagnostic quality;
* domain explicitness;
* consistency;
* reliability;
* operational visibility;
* performance;
* security;
* deletion of accidental complexity;
* reduction of duplication;
* reduction of cognitive load.

A recommendation is invalid if its only justification is personal preference or architectural symmetry.

## 3. Architecture must emerge from pressure

Do not recommend abstractions pre-emptively. Recommend an abstraction only when there is evidence of at least one of the following:

* meaningful duplicated behaviour;
* growing combinatorial logic;
* repeated setup around the same decision;
* multiple callers depending on the same concept;
* repeated changes affecting the same group of files;
* infrastructure obstructing testing of a real decision;
* a concept with rules but no explicit representation;
* an external boundary with real behavioural or operational complexity;
* a responsibility that already varies independently.

Do not introduce an interface merely because a class has dependencies, or a layer merely to conform to an architectural template. Do not suggest repositories, services, factories, handlers, ports, adapters, or domain objects unless repository evidence supports their existence.

## 4. Preserve the outer safety net

When proposing a test descent or extraction:

* identify which behavioural tests should remain at the public boundary;
* identify which combinatorial cases should move to a smaller component;
* explain what wiring remains protected;
* explain what feedback becomes faster or more precise;
* do not replace all black-box coverage with isolated tests.

The intended model is:

```text
Public behaviour tests
    protect capabilities and wiring

Focused component tests
    protect combinatorial decisions

Adapter or integration tests
    protect technology-specific semantics
```

## 5. Separate capability changes from refactoring

Do not include product features in the report. A valid initiative must preserve observable product behaviour unless explicitly classified as deletion of unused behaviour, correction of an inconsistency, or removal of dead or unreachable paths.

When an opportunity requires changing product behaviour, report it as:

```text
Not a refactoring initiative — requires product decision
```

Do not mix it into the prioritized refactoring list.

---

# Inspection process

Perform the inspection in the following order.

## Step 1: Understand the delivered system

Identify deployable applications, packages or libraries, public APIs, background workers, databases, external integrations, frontend applications, shared modules, test suites, and build/deployment artifacts.

Determine the real public boundaries of each component: HTTP endpoints, browser-visible behaviour, messages consumed or produced, NuGet public APIs, CLI commands, scheduled jobs, persisted business effects.

## Step 2: Inspect recent change pressure

When Git history is available, inspect files commonly changed together, hotspots with high churn, repeated fixes in the same area, features that repeatedly modify the same conditional logic, tests frequently updated alongside implementation details, and modules that accumulate unrelated responsibilities.

Change history is strong evidence because architecture should optimise actual change patterns, not hypothetical ones. Do not treat churn alone as a problem — explain why the observed co-change suggests an unstable or missing boundary.

## Step 3: Inspect behavioural protection

For each important capability, determine whether the repository contains evidence that the delivered artifact behaves correctly.

Look for black-box acceptance tests, component tests, contract tests, package-consumer tests, integration tests against real infrastructure, isolated domain tests, and architecture or static-analysis tests.

Identify gaps such as:

* critical behaviour covered only through mocks;
* tests bypassing the production bootstrap;
* acceptance tests using internal project references;
* tests altering dependency injection in ways unavailable in production;
* business rules covered only indirectly;
* test suites that assert status codes but not business effects;
* important error or recovery paths with no protection;
* tests generated from the implementation rather than from an independent capability specification.

Coverage is evidence of execution, not evidence of correctness. Do not optimise for line coverage alone.

## Step 4: Inspect design pressure

Search for the criteria described in `criteria/` (see "Criteria catalogue" below).

For every candidate:

1. locate concrete evidence;
2. identify the affected attribute;
3. estimate impact;
4. estimate confidence;
5. estimate implementation cost;
6. estimate regression risk;
7. describe how success could be measured.

Discard candidates that cannot be supported with evidence.

---

# Criteria catalogue

Each criterion lives in its own file under `criteria/`, one file per `<id>.md`, so the catalogue can grow without inflating this file. Read every file in that directory when performing Step 4.

Each file contains a fenced `yaml` block with this schema:

```yaml
id:
name:
attribute_improved:
signals:
questions:
invalid_recommendations:
possible_measurements:
```

Some files add short prose after the block clarifying when the criterion legitimately applies versus when it looks applicable but isn't — read that prose too, it disambiguates the signals.

Current criteria: `duplicated-knowledge`, `unclear-naming`, `implicit-domain-concept`, `insufficient-behavioural-coverage`, `test-descent-opportunity`, `mixed-decisions-and-effects`, `excessive-coupling`, `low-cohesion`, `implementation-coupled-tests`, `technology-fake-risk`, `code-smell-with-impact`, `dead-or-obsolete-code`, `missing-operational-boundary`.

## Adding new criteria

Add a new file `criteria/<id>.md` following the schema above. No other part of this skill needs to change — Step 4 reads the whole directory.

A new criterion must describe a recurring codebase pressure, not a preferred solution.

Good: "Repeated permission rules are interpreted differently across endpoints."
Weak: "Use the specification pattern."

The catalogue must remain solution-independent wherever possible.

---

# Prioritisation model

Score every valid initiative from 1 to 5 on each dimension below.

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Impact | negligible local inconvenience | repeated cost in an active area | significant risk or major delivery constraint |
| Evidence confidence | plausible inference | multiple concrete examples | demonstrated by history, defects, tests, or measurements |
| Frequency | rare path | recurring area | central or frequently changed behaviour |
| Leverage | one isolated location | one important module or workflow | multiple features, teams, or future changes |
| Cost | small focused refactor | several coordinated changes | broad migration or high uncertainty |
| Regression risk | well-protected and local | moderate behavioural surface | weakly protected or cross-cutting |

Calculate:

```text
Priority score =
(Impact × Evidence confidence × Frequency × Leverage)
÷ (Cost + Regression risk)
```

Use the score for ordering, not as an unquestionable decision. A lower-scoring initiative may rank higher when it removes an immediate correctness or security risk, unlocks several blocked initiatives, establishes missing tests required for later work, or prevents imminent architectural lock-in. Explain any manual adjustment.

---

# Initiative validity gate

Do not include an initiative unless all answers are yes:

```text
[ ] There is concrete repository evidence.
[ ] The affected attribute is explicit.
[ ] The proposed boundary or change has a reason to exist.
[ ] The expected improvement can be observed or measured.
[ ] The initiative is behaviour-preserving or clearly classified otherwise.
[ ] The recommendation is more specific than "clean this up".
[ ] The recommendation does not depend only on a generic best practice.
```

If fewer than three initiatives pass this gate, report fewer than three. Do not fill the report with low-confidence observations.

---

# Required output

Return only a prioritized list of initiatives. Do not modify code, create branches or pull requests, include a generic architecture assessment before the list, or report praise, strengths, or minor stylistic suggestions.

Use this exact structure for every initiative.

## `<rank>. <initiative title>`

**Priority:** Critical | High | Medium | Low
**Score:** `<calculated score>`
**Confidence:** High | Medium | Low
**Type:** `<criterion id>`
**Affected area:** `<modules, files, components or capabilities>`

### Evidence

* `<specific repository observation with file or symbol references>`
* `<second supporting observation when available>`
* `<history, test, metric or defect evidence when available>`

### Current cost

Explain the concrete cost currently caused by the gap — e.g. several files must change for one rule, tests cannot distinguish which decision failed, production behaviour is protected only by mocks, the same concept is interpreted differently, acceptance feedback is too slow for frequent changes, a high-churn module contains unrelated responsibilities.

### Proposed initiative

Describe the smallest coherent refactoring initiative. Do not provide an implementation walkthrough. Do not prescribe a pattern unless the pattern directly follows from the evidence.

### Objective improvement

List the attributes improved and explain why.

```text
- Changeability: ...
- Correctness confidence: ...
- Test feedback speed: ...
```

### Validation

Describe how to verify that the initiative succeeded. Prefer measurable before-and-after evidence: affected files per representative change, duplicated rule implementations, acceptance suite runtime, retained black-box paths, focused cases added, dependency edges, mutation score, public surface, repeated setup, production failure visibility.

### Behavioural safety net

State which existing black-box or acceptance tests must remain unchanged, which additional characterisation tests are needed, which cases may descend to a smaller component, and what observable behaviour must remain identical.

### Estimated scope

Small | Medium | Large

### Why now

Explain why this initiative should be addressed before lower-ranked alternatives.

---

# Final rules

* Prefer five strong initiatives over twenty weak observations; merge findings that represent the same underlying architectural pressure rather than splitting one coherent refactor into many.
* Do not recommend rewriting working modules without strong evidence, and do not confuse architectural consistency with architectural quality.
* Weight high-churn, business-critical areas more heavily; do not optimise code that changes rarely unless it presents correctness, security, or operational risk.
* Distinguish abstraction from indirection, and large code from low-cohesion code.
* Treat tests and coverage as evidence, not as an end in themselves.
