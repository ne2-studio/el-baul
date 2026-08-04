import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

import * as Sentry from "@sentry/react";

import App from "./app/App.tsx";
import { CrashFallback } from "@/design-system/components/feedback/CrashFallback";
import "./styles/index.css";
import { registerSW } from "virtual:pwa-register";
import { initSentry } from "./sentry";
import { getEnv } from "./runtimeConfig";

initSentry();

const isNative = Capacitor.isNativePlatform();
const organizationId = getEnv('VITE_ZITADEL_ORGANIZATION_ID');

// Instanciado nosotros mismos (en vez de dejar que <AuthProvider> lo construya) para poder
// alimentarlo directamente con la URL de un deep link nativo — ver handleNativeCallback.
const userManager = new UserManager({
  authority: getEnv('VITE_OIDC_AUTHORITY'),
  client_id: getEnv('VITE_OIDC_CLIENT_ID'),
  redirect_uri: getEnv('VITE_OIDC_CALLBACK_URI'),
  // Reutiliza la misma URI que el callback de login: ya está registrada como deep link
  // nativo (AndroidManifest.xml / Info.plist) y como ruta web (/callback), así que el logout
  // puede volver a caer ahí sin abrir un segundo esquema/host.
  post_logout_redirect_uri: getEnv('VITE_OIDC_CALLBACK_URI'),
  scope: `openid profile email urn:zitadel:iam:org:id:${organizationId}`,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
});

// En nativo el proveedor OIDC nunca vuelve como una navegación de página: studio.ne2.elbaul://
// no es http/https, así que react-oidc-context no puede detectarlo leyendo window.location al
// montar (que es como funciona en web, vía onSigninCallback más abajo). En su lugar, alimentamos
// el UserManager compartido directamente con la URL del deep link — sin navegar ni recargar la
// WebView — para terminar en el mismo sitio al que llega react-oidc-context al procesar un
// signinCallback normal: emite "userLoaded", que <AuthProvider> ya escucha y refleja en
// auth.isAuthenticated.
//
// Esto también hace inofensiva la diferencia de comportamiento entre plataformas de
// getLaunchUrl() (ver docs/architecture/native-ios.md): si vuelve a entregarse la misma URL ya
// consumida, signinCallback simplemente falla (el `code`/`state` ya no son válidos) y se
// registra el error — no hay recarga de por medio que lo repita en bucle.
async function handleNativeCallback(url: string) {
  if (!url.startsWith('studio.ne2.elbaul')) {
    return;
  }

  const { searchParams } = new URL(url);

  // El logout reutiliza este mismo deep link como post_logout_redirect_uri (ver arriba) pero
  // sin `code`/`error`: signoutRedirect() ya limpió la sesión local antes de navegar fuera de
  // la app, así que no hay nada que canjear aquí.
  if (!searchParams.has('code') && !searchParams.has('error')) {
    return;
  }

  try {
    await userManager.signinCallback(url);
  } catch (error) {
    console.error('No se pudo completar el inicio de sesión nativo:', error);
  }
}

async function configureNativeDeepLinks() {
  if (!isNative) {
    return;
  }

  // App abierta mientras ya estaba ejecutándose.
  await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
    void handleNativeCallback(url);
  });

  // App arrancada desde cero mediante el callback. Se espera su resolución para que, si hay
  // sesión, <AuthProvider> arranque ya autenticado en vez de mostrar un parpadeo inicial sin
  // sesión mientras el intercambio de tokens todavía está en curso.
  const launchUrl = await CapacitorApp.getLaunchUrl();

  if (launchUrl?.url) {
    await handleNativeCallback(launchUrl.url);
  }
}

async function bootstrap() {
  if (!isNative) {
    registerSW({ immediate: true });
  }

  await configureNativeDeepLinks();

  createRoot(document.getElementById("root")!).render(
    <Sentry.ErrorBoundary fallback={<CrashFallback />}>
      <AuthProvider
        userManager={userManager}
        onSigninCallback={() => {
          window.history.replaceState({}, document.title, "/");
        }}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </Sentry.ErrorBoundary>,
  );
}

void bootstrap();