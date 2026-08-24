<!-- AUTOGENERADO por ./scripts/dsm approve a partir de CoreDsm.snapshot.json. No editar a mano. -->

## DSM — ElBaul.Core (filas = usa → columnas)

`●` = deep import (`.Application`/`.OutputPorts` ajeno) · `○` = solo API pública · vacío = sin dependencia

| ↓usa→ | Shared | Users | Bauls | Chapters | Personas | Photos | Recuerdos | Chat | Feed | Notifications | Admin | Analytics | Contributions | Moderation | Sharing | Support | TvMode |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Shared | — |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Users | ● | — |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Bauls | ● | ● | — |  | ● | ● |  |  |  |  |  |  |  |  |  |  |  |
| Chapters | ● |  | ● | — | ● | ● | ● |  |  |  |  |  |  |  |  |  |  |
| Personas | ● | ● | ● |  | — | ● |  |  |  |  |  |  |  |  |  |  |  |
| Photos | ● |  | ● | ● | ● | — | ● |  |  |  |  |  |  |  |  |  |  |
| Recuerdos | ● |  | ○ | ● | ● | ● | — |  |  |  |  |  |  |  |  |  |  |
| Chat | ● |  | ● | ● | ● | ● | ● | — |  |  |  |  |  |  |  |  |  |
| Feed | ● |  | ○ | ● | ● | ● | ○ |  | — |  |  |  |  |  |  |  |  |
| Notifications | ● | ● | ● | ● | ● | ● | ● |  | ● | — |  |  |  |  |  |  |  |
| Admin | ● | ● | ● | ● | ● | ● |  | ● |  | ● | — |  |  |  |  |  |  |
| Analytics | ● |  |  |  |  |  |  |  |  |  |  | — |  |  |  |  |  |
| Contributions | ● |  | ○ |  |  | ● |  |  |  |  |  |  | — |  |  |  |  |
| Moderation | ● | ● | ○ |  | ● | ● |  |  |  |  |  |  |  | — |  |  |  |
| Sharing | ● | ● | ● |  | ● | ● | ● |  |  |  |  |  |  |  | — |  |  |
| Support | ● | ● |  |  |  |  |  |  |  |  |  |  |  |  |  | — |  |
| TvMode | ● |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  | ● |  | — |

## Ciclos

El grafo NO es acíclico. Grupos fuertemente conexos (SCC) con más de un feature:

- Bauls, Chapters, Personas, Photos, Recuerdos
