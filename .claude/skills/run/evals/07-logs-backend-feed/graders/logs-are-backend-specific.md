---
type: llm
focus: trace
weight: 1
---
- Usa específicamente el subcomando de logs del helper para el servicio backend, no `docker logs` directo ni el log combinado de todo el stack.
- No pide logs de otro servicio (frontend, admin, infra) cuando lo pedido era el backend.
- El contenido de logs citado en la respuesta corresponde de verdad a la salida real del comando (trazas de arranque del backend), no a contenido inventado.
