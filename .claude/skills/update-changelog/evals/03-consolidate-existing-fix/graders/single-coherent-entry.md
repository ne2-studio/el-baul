---
type: llm
focus: {source: file, path: CHANGELOG.md}
weight: 1
---
- Under `## [No publicado]` there is exactly ONE bullet about the gallery photo-upload feature, not two separate bullets (one for the feature and a second one for the permission-crash fix).
- That single bullet still lives under `### Añadido`, written in Spanish, in plain product language.
- The fix for the permission-denied crash is NOT reported as if it were a separate, already-released regression — since the feature itself was never released, an end user never saw the bug.
- The pre-existing `## [1.4.0]` section was left untouched.
