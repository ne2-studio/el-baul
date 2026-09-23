---
type: llm
focus: trace
weight: 1
---
- Al pasar de `full-stack` a `frontend-dev`, usa el propio helper (`run-env frontend-dev`, dejando que reconcilie el modo anterior automáticamente, o `run-env cleanup` explícito) — no `docker` a mano.
- El agente no se bloquea pidiéndole al usuario que interprete el error o decida cómo proceder.
- La respuesta final refleja correctamente que `full-stack` quedó reconciliado/parado y que `frontend-dev` (`http://localhost:5173`) es lo que queda arriba, según la salida real de los comandos.
