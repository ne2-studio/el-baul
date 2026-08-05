# Prioritisation model

Score every valid initiative across three separate concerns: how much the underlying behaviour matters (**Value**), how much it currently hurts to work in that area (**Maintenance friction**), and how hard the fix itself is (**Delivery difficulty**). Keep these separate — do not fold context or cognitive cost back into Impact, or it gets rewarded (or forgotten) inconsistently across initiatives.

Score every dimension from 1 to 5.

### Value

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Impact | negligible local inconvenience | repeated cost in an active area | significant risk or major delivery constraint |
| Evidence confidence | plausible inference | multiple concrete examples | demonstrated by history, defects, tests, or measurements |
| Change frequency | rare path | recurring area | central or frequently changed behaviour |
| Scope of benefit | one isolated location | one important module or workflow | multiple features, teams, or future changes |

```text
Value = Impact × Evidence confidence × Change frequency × Scope of benefit
```

### Maintenance friction

The cost of living with the current structure today, independent of how hard it would be to fix. A stable, rarely-changed area can still score high here if active code must repeatedly cross into it to get anything done.

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Change surface | change is typically localised | several coordinated files | a small change forces crossing modules, projects, or layers |
| Context cost | behaviour is locatable from one clear entry point | requires navigating several related collaborators | requires reconstructing a scattered flow across many files, searches, or concepts |
| Failure ambiguity | failure is clearly attributable | diagnosis requires following several layers | multiple components could explain the same symptom and tests do not localise the decision |

```text
Maintenance friction = Change surface + Context cost + Failure ambiguity
```

Context cost and change surface are related but distinct: a fix may touch one file yet require reading fifteen to find which one, or the system may be well understood yet still require editing six contracts because of a badly placed boundary. Score them independently and let a representative maintenance task trace (Step 2 of `SKILL.md`) back the Context cost score with real numbers rather than impression.

### Delivery difficulty

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Implementation cost | small focused refactor | several coordinated changes | broad migration or high uncertainty |
| Regression risk | well-protected and local | moderate behavioural surface | weakly protected or cross-cutting |

```text
Delivery difficulty = Implementation cost + Regression risk
```

### Priority score

```text
Priority score = (Value + Maintenance friction) ÷ Delivery difficulty
```

Use the score for ordering, not as an unquestionable decision. A lower-scoring initiative may rank higher when it removes an immediate correctness or security risk, unlocks several blocked initiatives, establishes missing tests required for later work, or prevents imminent architectural lock-in. Explain any manual adjustment.
