import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

import * as Sentry from "@sentry/react";

import App from "./app/App.tsx";
import { CrashFallback } from "./app/components/CrashFallback";
import "./styles/index.css";
import { registerSW } from "virtual:pwa-register";
import { initSentry } from "./sentry";

initSentry();

const isNative = Capacitor.isNativePlatform();

function handleNativeCallback(url: string) {
  if (!url.startsWith('studio.ne2.elbaul')) {
    return;
  }

  const callbackUrl = new URL(url);

  // react-oidc-context espera encontrar code/state en la URL
  // cargada dentro de la WebView.
  const webViewCallbackUrl =
    `${window.location.origin}/callback` +
    callbackUrl.search +
    callbackUrl.hash;

  window.location.replace(webViewCallbackUrl);
}

async function configureNativeDeepLinks() {
  if (!isNative) {
    return;
  }

  // App abierta mientras ya estaba ejecutándose.
  await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
    handleNativeCallback(url);
  });

  // App arrancada desde cero mediante el callback.
  const launchUrl = await CapacitorApp.getLaunchUrl();

  if (launchUrl?.url) {
    handleNativeCallback(launchUrl.url);
  }
}

async function bootstrap() {
  if (!isNative) {
    registerSW({ immediate: true });
  }

  await configureNativeDeepLinks();

  const organizationId =
    import.meta.env.VITE_ZITADEL_ORGANIZATION_ID as string;

  const oidcConfig = {
    authority: import.meta.env.VITE_OIDC_AUTHORITY as string,
    client_id: import.meta.env.VITE_OIDC_CLIENT_ID as string,
    redirect_uri: import.meta.env.VITE_OIDC_CALLBACK_URI as string,
    scope: `openid profile email urn:zitadel:iam:org:id:${organizationId}`,
    userStore: new WebStorageStateStore({ store: window.localStorage }),

    onSigninCallback: () => {
      window.history.replaceState({}, document.title, "/");
    },
  };

  createRoot(document.getElementById("root")!).render(
    <Sentry.ErrorBoundary fallback={<CrashFallback />}>
      <AuthProvider {...oidcConfig}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </Sentry.ErrorBoundary>,
  );
}

void bootstrap();