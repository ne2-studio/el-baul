# Plan de extracción de ne2-factory

## Premisa

`ne2-factory` ya es reutilizable en un ~80 %. Lo que **no** es reutilizable es la
interfaz entre la factory y el repositorio sobre el que trabaja. Por eso este plan no
empieza creando un repo nuevo, ni un marketplace, ni wrappers, ni unidades de systemd.
Empieza explicitando esa interfaz y haciendo que El Baúl sea el primer *consumidor
agnóstico* de la factory **mientras los ficheros siguen viviendo en este repo**.

Sacarlo a un repo propio es de los últimos pasos, y para entonces es un movimiento
mecánico.

Dos reglas que gobiernan todo el plan:

> **Convención hasta que se demuestre que hace falta configurarlo.**
> Solo se añade un knob cuando un segundo proyecto necesita de verdad que ese valor
> sea distinto. Hasta entonces sigue siendo una convención de `ne2-factory`.

> **Slices verticales, no capas.**
> Cada slice deja el sistema funcionando igual que antes. No se construye el contrato
> entero para luego descubrir al usarlo que estaba mal: se prueba con un agente y se
> extiende.

## El seam: un contrato de entorno

Hoy los agentes de implementación saben demasiado de El Baúl:

```text
                  NE2 FACTORY
        ┌─────────────┼──────────────┐
   implementer    bug-fixer      verifier
        └──────┬──────┴──────┬───────┘
             run           verify
               │             │
             EL BAÚL       EL BAÚL
```

El objetivo es inversión de dependencias aplicada a agentes: la factory depende de un
conjunto pequeño, profundo y estable de capabilities que un proyecto debe ofrecer, no
de los comandos concretos de El Baúl.

```text
NE2 FACTORY
│
├── agents ────────────────┐  (owns outcome)
│   ├── implementer        │
│   ├── bug-fixer          │
│   └── verifier           │
│                          │
├── skills                 │  (know-how reutilizable)
│                          │
└── docs/environment-contract.md
            │ define la interfaz esperada
            ▼
PROYECTO CONSUMIDOR (adaptador)
│
├── .claude/skills/run                ← implementación
├── .claude/skills/verify             ← implementación
├── .claude/skills/update-changelog   ← implementación (opcional)
└── .ne2-factory/project.md           ← contexto semántico
```

`implementer` nunca debería contener `dotnet test`, `npm test`, `docker compose up` ni
`./scripts/verify backend`. Conceptualmente dice `verify(change)` y el proyecto decide
cómo.

### El contrato NO es una skill

Una skill es *know-how* que un agente aplica (`find-architecture-gaps`,
`read-github-ticket`). El contrato de entorno no hace nada: es una **especificación de
interfaz** entre dos módulos —la factory y el proyecto—, el equivalente agéntico de un
`interface IFactoryEnvironment`. Encaja con la constitución del sistema (`agent =
outcome`, `skill = know-how`): el contrato no es ninguno de los dos.

Por eso vive como documentación del plugin, no como skill:

```text
.claude/skills/ne2-factory/
  agents/
  skills/
  docs/
    environment-contract.md      ← el contrato
```

Y las **implementaciones** de ese contrato sí son skills, y viven en el proyecto
consumidor (`.claude/skills/{run,verify,update-changelog}`).

## El adaptador de El Baúl: dos mundos

| Aspecto | Vive en | Lo lee | Formato |
|---|---|---|---|
| Reviewer, rama por defecto, lista de servicios, rutas de documentación | `.ne2-factory/project.md` | los agentes (razonamiento semántico) | prosa Markdown |
| Nombre de la sesión de tmux, scopes de gap-scout | `.ne2-factory.env` | `./scripts/backlog`, `./scripts/gap-scout` | variables de shell |
| Cómo arrancar la app | `.claude/skills/run/` (sin cambios) | los agentes, vía el contrato | skill |
| Cómo reunir evidencia | `.claude/skills/verify/` (sin cambios) | los agentes, vía el contrato | skill |
| Policy de changelog | `.claude/skills/update-changelog/` (sin cambios) | los agentes, vía el contrato | skill |

Regla del reparto: **si solo lo lee bash, va en `.ne2-factory.env`; si un agente
razona sobre ello, va en `.ne2-factory/project.md`.**

Las skills `run` / `verify` / `update-changelog` no se mueven ni se reescriben. Lo que
cambia es su *estatus*: dejan de ser «skills de El Baúl que la factory llama por
casualidad» y pasan a ser «la implementación por parte de El Baúl del contrato de
entorno de `ne2-factory`».

---

## Roadmap por slices

### Slice 1 — Probar el seam

El slice vertical mínimo: escribir el contrato y validarlo migrando **un solo agente**,
`verifier`, que es el de dependencia más pequeña (`verify` + `run`, nada de servicios,
docs, rama ni ticket workflow).

1. Escribir `.claude/skills/ne2-factory/docs/environment-contract.md`. Por cada
   capability: **Propósito / Entrada / Salida / Garantías**, y nada sobre cómo lo
   satisface un proyecto concreto. En prosa, sin manifiesto estructurado:

   ```md
   ## Required capabilities
   - run
   - verify

   ## Optional capabilities
   - update-changelog   (si el proyecto no la ofrece, se salta el paso de changelog)
   ```

   Un manifiesto YAML de capabilities se introduce solo si algún día hace falta
   detectarlas programáticamente. Ahora no hay consumidor para eso.

2. Introducir `.ne2-factory/project.md` como stub (solo `Reviewer` y `Default
   branch`); crece en el Slice 2.

3. Migrar `verifier`: donde nombra las skills `verify` / `run`, que apunte al contrato
   (`docs/environment-contract.md`) en vez de tratarlas como skills sueltas de El Baúl.

4. Verificar: correr `verifier` sobre un diff real de El Baúl.

**Aceptación:**
- `verifier` se comporta exactamente igual que hoy.
- Ningún camino de ejecución de `verifier` depende de conocimiento específico de El
  Baúl (comandos, puertos, rutas, nombre de rama). Un grep de `Pedro`, `El Baúl`,
  `api|app|admin`, `ARCHITECTURE.md`, `main` es la *técnica* para comprobarlo; que una
  frase de ejemplo en documentación mencione El Baúl no incumple el criterio —lo
  incumple que la lógica dependa de ese valor.

### Slice 2 — Mover los agentes de implementación detrás del seam

Una vez el seam está probado con `verifier`, migrar los que lo atraviesan de verdad,
uno a uno, verificando entre medias.

- `bug-fixer`: depende de `run` + `verifier`. Migrar y probar con un bug reproducible.
- `implementer`: el que más atraviesa —project docs, servicios, `run`, `verify`,
  changelog, rama, ticket workflow—. Migrar y probar.
- Ampliar `.ne2-factory/project.md` con `Services` y `Documentation`.

Referencias con conocimiento de proyecto que se quitan de la factory:

| Referencia | Dónde | Pasa a |
|---|---|---|
| «Pedro» | `agents/refiner.md`, `agents/architecture-gap-scout.md` | «el reviewer indicado en `.ne2-factory/project.md`» |
| `api/` `app/` `admin/` enumerados | `agents/implementer.md` | «los servicios listados en `.ne2-factory/project.md`» |
| `docs/ARCHITECTURE.md`, `docs/API-CONVENTIONS.md`, `docs/DESIGN.md` | `agents/implementer.md`, `skills/work-ticket/SKILL.md` | «las rutas de documentación de `.ne2-factory/project.md`» |
| `main` (literal) | `skills/work-ticket/SKILL.md` | «la rama por defecto de `.ne2-factory/project.md`» |
| Nombres de skill `run` / `verify` / `update-changelog` | `agents/{implementer,bug-fixer,verifier}.md` | Se mantienen los nombres, apuntando al contrato de entorno |

Cada agente recibe una instrucción breve al principio: *«Lee `.ne2-factory/project.md`
para el contexto del proyecto (reviewer, rama, servicios, docs) antes de continuar.»*

**Aceptación:**
- Ningún conocimiento específico de proyecto permanece en los caminos de ejecución de
  `implementer`, `bug-fixer` ni `verifier`.
- Un cambio de ejemplo y un bug de ejemplo se resuelven end-to-end igual que hoy.

### Slice 3 — Mover la orquestación detrás de la config de proyecto

- `work-ticket`, `refine-backlog`: quitar rutas de docs y rama literales; leer de
  `.ne2-factory/project.md`.
- `scripts/backlog`, `scripts/gap-scout`: leer `TMUX_SESSION` y `GAP_SCOUT_SCOPES` de
  `.ne2-factory.env`.

**Aceptación:**
- `/refine-backlog`, `./scripts/backlog run` y `./scripts/gap-scout scan` se comportan
  **exactamente igual que hoy**: mismos prompts, commits, comentarios en issues y
  labels.
- La factory tendría sentido copiada tal cual a un repo sin relación que aportara su
  propio `.ne2-factory/` y sus skills `run`/`verify`.

### Slice 4 — Extraer físicamente el repo

Solo cuando los slices 1-3 estén hechos y el pipeline demostrablemente sin cambios.

```text
github.com/ne2-studio/ne2-factory
  .claude-plugin/       plugin.json (+ marketplace.json)
  agents/
  skills/
  bin/                  backlog, gap-scout (movidos aquí, parametrizados por .ne2-factory.env)
  docs/                 environment-contract.md, agent-system-design-constitution.md, backlog/*.md
```

El Baúl se queda solo con el adaptador:

```text
el-baul/
  .claude/skills/{run,verify,update-changelog}/
  .ne2-factory/project.md
  .ne2-factory.env
  # plugin ne2-factory instalado
```

El método de instalación puede ser lo más cutre que funcione (una ruta versionada en
el repo o un submódulo de git al principio). El riesgo no es la distribución, es la
interfaz. Un marketplace pulido es una mejora posterior y aparte.

**Aceptación:** el pipeline de El Baúl se comporta igual con la factory fuera del repo.

### Slice 5 — Probar en un segundo proyecto (la definición real de éxito)

Instalar `ne2-factory` en Terd BNPL: .NET / AWS / Shopify / Postgres / Terraform /
CloudWatch — otra arquitectura, otros comandos, otros riesgos, el mismo workflow
mental (refine → implement → verify → cerrar ticket).

> **Criterio de éxito del proyecto entero:** escribir `bnpl/.claude/skills/run`,
> `bnpl/.claude/skills/verify` y `bnpl/.ne2-factory/project.md`, y que `implementer`
> funcione con **cero cambios en `ne2-factory`**.

Si eso se cumple, el seam es correcto. Ese resultado importa más que un marketplace
que funcione.

---

## Fuera del alcance de este plan

- Una historia de marketplace / distribución pulida.
- Generalizar todos los smells de arquitectura para quitarles el vocabulario .NET.
- Parametrizar todas las labels (`backlog`, `refined`, `gap-scout`, `backlog:failed`
  son convenciones de `ne2-factory`) y todas las rutas.
- Cambiar el protocolo `.backlog/.signal`.
- Generalizar la infraestructura de scheduling/tmux/VPS de `gap-scout`.
- Un manifiesto estructurado de capabilities.

Cada una es un follow-up, disparado por una necesidad real, no por esta extracción.

---

## Empieza aquí: el primer ticket

**Título:** Prove the ne2-factory environment seam with verifier

**Alcance (Slice 1):**

1. Documentar las capabilities que `ne2-factory` espera de un repositorio en
   `docs/environment-contract.md` (prosa: required `run`, `verify`; optional
   `update-changelog`).
2. Introducir `.ne2-factory/project.md` como stub (`Reviewer`, `Default branch`).
3. Migrar solo `verifier` para que dependa del contrato, no de conocimiento de
   ejecución específico de El Baúl.
4. Verificar que `verifier` se comporta igual sobre un diff real.

**No-objetivo:** migrar `implementer` / `bug-fixer`, tocar la orquestación, crear el
repo externo, introducir un manifiesto de capabilities.

Cuando este ticket esté hecho habrás demostrado el camino `factory → contrato de
entorno → El Baúl verify` con el mínimo de cambios. Los slices 2 y 3 lo extienden al
resto; el 4 mueve los ficheros; el 5 lo valida en BNPL.

## Por qué este orden

El riesgo está en la interfaz, no en el empaquetado. Cada slice deja el sistema
funcionando, así que un contrato equivocado se descubre al migrar `verifier`, no
después de reescribir tres agentes. Es el mismo principio que un deep module: la
reutilización no viene de meter todo en una capa genérica, viene de diseñar una única
interfaz pequeña, profunda y estable. Aquí esa interfaz no es un conjunto de
interfaces de C#: es el conjunto de capabilities que un proyecto debe ofrecerle a la
software factory.
