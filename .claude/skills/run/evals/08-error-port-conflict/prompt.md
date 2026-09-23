---
max_turns: 25
timeout_seconds: 500
allowed_tools: [Skill, Bash]
runs: 3
---
Antes de nada, simula que ya tenía un proceso mío ocupando el puerto 5050 sin que tú lo supieras: en un único comando de shell, deja algo escuchando en el puerto 5050 (un servidor HTTP mínimo ad hoc en background) y, en ese mismo comando, arranca justo después `backend-dev`. Tiene que ser un solo comando para que ambos pasos compartan el mismo entorno de red.
