```yaml
id: context-scattering
name: Excessive context required to understand or change behaviour
attribute_improved:
  - context efficiency
  - comprehensibility
  - locality of change
  - changeability
  - correctness confidence
  - reduction of cognitive load
signals:
  - Understanding one capability requires navigating many files or directories.
  - The behaviour of one operation is distributed across handlers, services, validators, mappers, repositories, hooks, middleware, and configuration without clear locality.
  - A maintainer must reconstruct execution flow through multiple forwarding abstractions.
  - Domain terminology, rules, tests, and persistence mapping are far apart despite changing together.
  - Relevant behaviour cannot be discovered from a clear module entry point.
  - Tests for one capability are scattered across several suites with no obvious relationship.
  - A small behavioural change requires repeated repository searches to find all participating code.
  - Files frequently read together are not located or exposed as one understandable module.
  - Boilerplate or indirection consumes more context than the business decision being changed.
  - The same capability is represented differently across frontend, backend, tests, and contracts without an explicit correspondence.
questions:
  - What is the minimum set of files required to understand this capability end to end?
  - Which of those files contain essential decisions, and which only forward or translate?
  - Can a maintainer discover the relevant code from one stable entry point?
  - Are concepts that change together located together?
  - How many repository searches or navigation steps are required before a safe change can be made?
  - Does the architecture minimise irrelevant context while preserving necessary boundaries?
  - Could the same behaviour be understood with fewer public concepts or hops?
invalid_recommendations:
  - Co-locate all code regardless of deployability, ownership, or runtime boundary.
  - Merge files solely to reduce file count.
  - Remove abstractions that genuinely isolate independent volatility.
  - Optimise for lower file or token count while harming correctness or operational boundaries.
  - Treat directory depth or number of files alone as evidence.
  - Recommend feature folders without showing that current scattering creates navigation or change cost.
possible_measurements:
  - Files required to understand a representative capability.
  - Files modified for a representative behavioural change.
  - Navigation or search steps required to locate the decision.
  - Number of forwarding hops between public entry point and business decision.
  - Distinct directories or projects involved in one cohesive change.
  - Tokens or lines of context needed to inspect the relevant implementation.
  - Number of public symbols involved in one capability.
  - Frequency with which relevant files are read or modified together.
```

Context efficiency is how much a maintainer — human or agent — must read, search, and hold in mind to understand or safely change one capability. Two codebases can be equally readable file by file while one requires reading four files to explain a feature and the other eighteen; only change-history evidence or a reconstruction exercise reveals that difference, not inspection of any single file.

The strongest evidence for this criterion is a **representative maintenance task trace**: pick one real capability, walk it end to end from its public entry point, and record what the walk actually cost — e.g. "11 implementation files across 5 directories; 6 forwarding abstractions; 3 separate representations of the same status; 4 searches before locating the final decision; no single public contract describing the capability." This is demonstrable in a way that "this feels hard to follow" is not, and it is what step 4's context reconstruction task is for.
