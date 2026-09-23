---
max_turns: 8
timeout_seconds: 120
allowed_tools: [Skill, Write]
runs: 3
---
You're about to commit the following change to the El Baúl repository. Before committing, review whether anything else in the repo needs to be updated as part of this commit, and make any file edits you think are needed.

Commit summary:
fix(sharing): fix a crash on Android when opening a shared Recuerdo link from outside the app. The deep link handler was not initialized before the activity read its intent extras.

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
