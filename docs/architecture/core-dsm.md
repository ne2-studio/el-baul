<!-- AUTOGENERADO por ./scripts/dsm approve a partir de CoreDsm.snapshot.json. No editar a mano. -->

## DSM — ElBaul.Core (filas = usa → columnas)

`●` = deep import (`.Application`/`.OutputPorts` ajeno) · `○` = solo API pública · vacío = sin dependencia

| ↓usa→ | Admin | Analytics | Bauls | Chapters | Chat | Contributions | Feed | Moderation | Notifications | Personas | Photos | Recuerdos | Shared | Sharing | Support | TvMode | Users |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Admin | — |  | ● | ● | ● |  |  |  | ● | ● | ● |  | ● |  |  |  | ● |
| Analytics |  | — |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |  |
| Bauls |  |  | — |  |  |  |  |  |  | ● | ● |  | ● |  |  |  | ● |
| Chapters |  |  | ● | — |  |  |  |  |  | ● | ● | ● | ● |  |  |  |  |
| Chat |  |  | ● | ● | — |  |  |  |  | ● | ● | ● | ● |  |  |  |  |
| Contributions |  |  | ● |  |  | — |  |  |  |  | ● |  | ● |  |  |  |  |
| Feed |  |  | ● | ● |  |  | — |  |  | ● | ● | ○ | ● |  |  |  |  |
| Moderation |  |  | ● |  |  |  |  | — |  |  | ● |  | ● |  |  |  | ● |
| Notifications |  |  | ● | ● |  |  | ● |  | — |  | ● | ● | ● |  |  |  | ● |
| Personas |  |  | ● |  |  |  |  |  |  | — | ● |  | ● |  |  |  | ● |
| Photos |  |  | ● | ● |  |  |  |  |  | ● | — | ● | ● |  |  |  |  |
| Recuerdos |  |  | ● | ● |  |  |  |  |  | ● | ● | — | ● |  |  |  |  |
| Shared |  |  |  |  |  |  |  |  |  |  |  |  | — |  |  |  |  |
| Sharing |  |  | ● |  |  |  |  |  |  | ● | ● | ● | ● | — |  |  | ● |
| Support |  |  |  |  |  |  |  |  |  |  |  |  | ● |  | — |  | ● |
| TvMode |  |  | ● | ● |  |  |  |  |  | ● | ● | ● | ● | ● |  | — |  |
| Users |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |  | — |

## Ciclos

El grafo NO es acíclico. Grupos fuertemente conexos (SCC) con más de un feature:

- Bauls, Chapters, Personas, Photos, Recuerdos
