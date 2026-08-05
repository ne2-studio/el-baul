# Output template

Return only a prioritized list of initiatives. Do not modify code, create branches or pull requests, include a generic architecture assessment before the list, or report praise, strengths, or minor stylistic suggestions.

Use this exact structure for every initiative.

## `<rank>. <initiative title>`

**Priority:** Critical | High | Medium | Low
**Score:** `<calculated priority score>` (Value: `<v>` · Maintenance friction: `<f>` · Delivery difficulty: `<d>`)
**Confidence:** High | Medium | Low
**Type:** `<smell id>`
**Affected area:** `<modules, files, components or capabilities>`

### Evidence

* `<specific repository observation with file or symbol references>`
* `<second supporting observation when available>`
* `<history, test, metric or defect evidence when available>`
* `<representative maintenance task trace when available: files opened, searches performed, layers crossed>`

### Current cost

Explain the concrete cost currently caused by the gap — e.g. several files must change for one rule, tests cannot distinguish which decision failed, production behaviour is protected only by mocks, the same concept is interpreted differently, acceptance feedback is too slow for frequent changes, a high-churn module contains unrelated responsibilities.

### Tension

Name the attributes (`attributes.md`) currently competing or being balanced badly — the reason this isn't a free improvement.

### Proposed initiative

Describe the smallest coherent refactoring initiative. Do not provide an implementation walkthrough. Do not prescribe a pattern unless the pattern directly follows from the evidence.

### Objective improvement

List the attributes improved and explain why.

```text
- Modifiability: ...
- Consistency: ...
- Testability: ...
```

### Trade-off

State what the movement costs — the attribute it puts under further tension, the indirection it adds, or the case where it would not yet be justified.

### Validation

Describe how to verify that the initiative succeeded. Prefer measurable before-and-after evidence: affected files per representative change, duplicated rule implementations, acceptance suite runtime, retained black-box paths, focused cases added, dependency edges, mutation score, public surface, repeated setup, production failure visibility.

### Behavioural safety net

State which existing black-box or acceptance tests must remain unchanged, which additional characterisation tests are needed, which cases may descend to a smaller component, and what observable behaviour must remain identical.

### Estimated scope

Small | Medium | Large

### Why now

Explain why this initiative should be addressed before lower-ranked alternatives.
