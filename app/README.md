# 📦 El Baúl - Álbumes de Recuerdos Compartidos

[![CI](https://github.com/ppardalj/el-baul-frontend/actions/workflows/deploy.yml/badge.svg)](https://github.com/ppardalj/el-baul-frontend/actions)

**El Baúl** es una plataforma moderna diseñada para preservar y compartir recuerdos familiares y de amigos de forma segura y organizada. Este repositorio contiene el frontend de la aplicación, construido con un enfoque en la experiencia de usuario, la rapidez y una arquitectura escalable.

---

## ✨ Características Principales

-   **🗄️ Gestión de Baúles:** Crea contenedores temáticos (baúles) para organizar tus álbumes.
-   **📸 Álbumes Fotográficos:** Organiza tus fotos en álbumes dentro de cada baúl.
-   **🤝 Colaboración en Tiempo Real:** Invita a otros usuarios a tus baúles, gestiona roles y permisos (Custodio, Editor, Lector).
-   **🔔 Centro de Actividad:** Mantente al día con las últimas fotos subidas y cambios en tus baúles.
-   **🛡️ Solicitudes de Acceso y Borrado:** Sistema de gobernanza para mantener la privacidad y el control del contenido compartido.
-   **📱 Diseño Responsivo:** Optimizado para una experiencia fluida tanto en escritorio como en dispositivos móviles.

---

## 🚀 Stack Tecnológico

-   **Core:** [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
-   **Build Tool:** [Vite](https://vitejs.dev/)
-   **Estado Global:** [Zustand](https://github.com/pmndrs/zustand) (Gestión de datos y autenticación)
-   **Estilos:** [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
-   **Animaciones:** [Framer Motion](https://www.framer.com/motion/)
-   **Backend & Auth:** [Supabase](https://supabase.com/) (Integrado con un sistema de servicios desacoplado)
-   **Iconografía:** [Lucide React](https://lucide.dev/)

---

## 🛠️ Instalación y Uso

### Requisitos Previos

-   [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
-   `npm` o `pnpm`

### Pasos para echarlo a andar

1.  **Clonar el repositorio:**
    ```bash
    git clone [url-del-repo]
    cd el-baul-frontend
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configuración del Entorno:**
    Crea un archivo `.env` en la raíz (o configura tus variables de entorno) con las credenciales de Supabase si deseas conectar con un backend real:
    ```env
    VITE_SUPABASE_URL=tu_url_de_supabase
    VITE_SUPABASE_ANON_KEY=tu_anon_key
    ```
    *Nota: La aplicación incluye un modo demo que permite explorar la interfaz sin configuración previa.*

4.  **Ejecutar en desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:5173`.

5.  **Construir para producción:**
    ```bash
    npm run build
    ```

---

## 🔐 Modo Demo (Importante)

Actualmente, la aplicación está configurada con un **Modo Demo** habilitado por defecto:
-   El login con Google está simulado (mock). Al hacer clic en "Continuar con Google", se inicia sesión automáticamente con un perfil de prueba.
-   La persistencia de datos utiliza un cliente de Supabase, pero la lógica de servicios está preparada para manejar tanto datos reales como flujos simulados.

---

## 📁 Estructura del Proyecto

```text
src/
├── app/           # Componentes base, rutas y layout principal
├── features/      # Módulos por dominio (auth, baules, albums, photos, etc.)
├── services/      # Capa de comunicación con la API y Supabase
├── store/         # Gestión de estado global con Zustand
├── types/         # Definiciones de tipos TypeScript
├── utils/         # Funciones de utilidad y helpers
└── styles/        # Configuraciones globales de CSS
```

---

## 🎨 Diseño Original

Este proyecto nació a partir del prototipo diseñado en Figma: [El Baúl App Prototype](https://www.figma.com/design/2TWXsOsRjSdpphDCRWzgf6/El-Ba%C3%BAl-App-Prototype).

---
Desarrollado con ❤️ para preservar los mejores recuerdos.
  