# 📦 El Baúl — Frontend

**El Baúl** es una plataforma para preservar y compartir recuerdos familiares y de amigos
de forma segura y organizada. Este directorio contiene el frontend, construido siguiendo
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

---

## ✨ Características principales

- **🗄️ Gestión de baúles:** crea contenedores temáticos (baúles) para organizar tus álbumes.
- **📸 Álbumes fotográficos:** organiza tus fotos en álbumes dentro de cada baúl.
- **🤝 Colaboración:** invita a otros usuarios a tus baúles, gestiona roles (custodio, colaborador, miembro).
- **🔔 Centro de actividad:** mantente al día con las últimas fotos subidas y cambios en tus baúles.
- **🛡️ Solicitudes de acceso y borrado:** gobernanza para mantener la privacidad y el control del contenido compartido.
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
   `VITE_OIDC_CLIENT_ID`, and `VITE_ZITADEL_ORGANIZATION_ID` (scopes the login screen to
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

## 📁 Estructura del proyecto

```text
src/
├── api.ts         # Single fetch client for the backend (namespaced per resource)
├── types/         # Domain entity classes, hydrated from api.ts responses
├── app/           # Componentes base, rutas y layout principal
├── features/      # Módulos por dominio (auth, baules, albums, photos, sharing, activity, profile)
├── store/         # Zustand: useAppStore (domain data) + uiStore (toasts/modals)
└── utils/         # Funciones de utilidad y helpers
```

---

## 🎨 Diseño original

Este proyecto nació a partir del prototipo diseñado en Figma: [El Baúl App Prototype](https://www.figma.com/design/2TWXsOsRjSdpphDCRWzgf6/El-Ba%C3%BAl-App-Prototype).

---
Desarrollado con ❤️ para preservar los mejores recuerdos.
