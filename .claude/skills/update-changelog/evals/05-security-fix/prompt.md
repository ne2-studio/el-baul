---
max_turns: 8
timeout_seconds: 120
allowed_tools: [Skill, Write]
runs: 3
---
You're about to commit the following change to the El Baúl repository. Before committing, review whether anything else in the repo needs to be updated as part of this commit, and make any file edits you think are needed.

Commit summary:
fix(sharing): sanitize user-submitted comment text before rendering it on the public Recuerdo sharing page, closing an XSS vulnerability that allowed injecting arbitrary HTML/JS via a comment.

Current contents of `CHANGELOG.md`:

```
# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [No publicado]

## [1.4.0] - 2026-08-15

### Arreglado

- Se corrigió un error que impedía compartir un Recuerdo desde el móvil.
```

Make any file edits you think are needed, then explain what you did (and why) in your final answer.
