# 📦 El Baúl — Frontend

**El Baúl** es una plataforma para preservar y compartir recuerdos familiares y de amigos
de forma segura y organizada. Este directorio contiene el frontend, construido siguiendo
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) y el sistema de diseño definido en
[`docs/DESIGN.md`](../docs/DESIGN.md).

---

## ✨ Características principales

- **🗄️ Gestión de baúles:** crea contenedores temáticos (baúles) para organizar tus álbumes.
- **📸 Álbumes fotográficos:** organiza tus fotos en álbumes dentro de cada baúl.
- **🤝 Colaboración:** invita a otros usuarios a tus baúles, gestiona roles (custodio, colaborador, miembro).
- **🛡️ Solicitudes de borrado:** gobernanza para mantener la privacidad y el control del contenido compartido.
- **📱 Diseño responsivo:** optimizado tanto para escritorio como para móvil.

---

## 🚀 Stack tecnológico

- **Core:** [React 19](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build tool:** [Vite](https://vitejs.dev/)
- **Estado global:** [Zustand](https://github.com/pmndrs/zustand)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Animaciones:** [Motion](https://www.framer.com/motion/)
- **Auth:** OIDC ([react-oidc-context](https://github.com/authts/react-oidc-context)) — the app authenticates against any standard OIDC provider (a [fake-oidc](https://github.com/ne2-studio/fake-oidc) provider is wired up for local dev via the root `docker-compose.yaml`)
- **Backend:** [`../api`](../api) (ASP.NET Core), talked to via `src/api.ts`
- **Iconografía:** [Lucide React](https://lucide.dev/)

---

## 🛠️ Instalación y uso

### Requisitos previos

- [Node.js](https://nodejs.org/) 22+

### Pasos

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar el entorno:**
   ```bash
   cp .env.example .env
   ```
   `.env` needs `VITE_API_URL` (the backend's base URL), `VITE_OIDC_AUTHORITY`,
   `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_CALLBACK_URI`, and `VITE_ZITADEL_ORGANIZATION_ID` (scopes the login screen to
   the right Zitadel organization). The committed defaults point at the backend/fake-oidc
   from the root `docker-compose.yaml` running on localhost.

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`. You'll need the backend (and,
   for a full login flow, fake-oidc) running too — see the root [`README.md`](../README.md)
   for `docker compose up`.

4. **Type-check y build para producción:**
   ```bash
   npm run typecheck
   npm run build
   ```

---

## 🔐 Autenticación

There's no mock/demo login — the app always redirects to the configured OIDC provider's
`/authorize` endpoint (`react-oidc-context`'s `signinRedirect()`) and only becomes
authenticated once that flow completes. Locally that provider is
[fake-oidc](https://github.com/ne2-studio/fake-oidc) (via `docker-compose.yaml` at the
repo root), which has no real login UI — it issues a token for whichever user the sign-in
request's `login_hint` selects.

---

## 🧪 Tests

```bash
npm test                       # Vitest — unit tests (store logic, utils)
npm run test:image-acceptance  # Playwright — el-baul-api-lite, behavioral regression coverage
npm run test:e2e               # Playwright — full docker-compose stack, login-only smoke check
```

- **`npm test`** (Vitest) — fast, in-process: store logic (`useAppStore.recuerdos.test.ts`)
  and `utils/timeUtils.test.ts`. `npm run test:watch` while iterating.
- **`npm run test:image-acceptance`** (`e2e-image-acceptance/`) — the suite to reach for while
  working on **photo upload/move/delete, persona invite/role-change/revoke, or
  removal-request submit/approve/reject**: it's real end-to-end coverage of exactly those
  flows, against the already-built frontend image + [`el-baul-api-lite`](../api/README.md)
  (everything in memory, no Postgres/MinIO/imgproxy). ~5x faster than `test:e2e` and what
  gates `frontend-deploy.yml`. Needs both images built first:
  ```bash
  docker build -t el-baul-app:local .
  docker build -f ../api/ElBaul.Api.Lite/Dockerfile -t el-baul-api-lite:local ../api
  APP_IMAGE=el-baul-app:local API_LITE_IMAGE=el-baul-api-lite:local npm run test:image-acceptance
  ```
- **`npm run test:e2e`** (`e2e/`) — boots the real `docker-compose.yaml` stack from source and
  checks login → home end to end. The only suite exercising actual production infra wiring
  (real Postgres/MinIO/imgproxy); also runs nightly in CI, decoupled from any deploy.

See the Frontend Testing section in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) and the
repo's `run`/`verify` Claude Code skills for more on when to run which.

---

## 📁 Estructura del proyecto

```text
src/
├── api.ts         # Single fetch client for the backend (namespaced per resource)
├── types/         # Domain entity classes, hydrated from api.ts responses
├── app/           # Componentes base, rutas y layout principal
├── features/      # Módulos por dominio (auth, baules, chapters, photos, sharing, profile)
├── store/         # Zustand: useAppStore (domain data) + uiStore (toasts/modals)
└── utils/         # Funciones de utilidad y helpers
```

---

## 🎨 Diseño original

Este proyecto nació a partir del prototipo diseñado en Figma: [El Baúl App Prototype](https://www.figma.com/design/2TWXsOsRjSdpphDCRWzgf6/El-Ba%C3%BAl-App-Prototype).
Los tokens de diseño (colores, tipografía, espaciado, radios) derivados de ese prototipo
están documentados en [`docs/DESIGN.md`](../docs/DESIGN.md) y son la fuente de verdad
para el tema de Tailwind (`@theme` en `index.css`).

---
Desarrollado con ❤️ para preservar los mejores recuerdos.
