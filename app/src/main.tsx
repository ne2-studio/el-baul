
  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router-dom";
  import { AuthProvider } from "react-oidc-context";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { registerSW } from 'virtual:pwa-register'

  registerSW({ immediate: true })

  const oidcConfig = {
    authority: import.meta.env.VITE_OIDC_AUTHORITY as string,
    client_id: import.meta.env.VITE_OIDC_CLIENT_ID as string,
    redirect_uri: `${window.location.origin}/callback`,
    scope: "openid profile email",
    onSigninCallback: () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    },
  };

  createRoot(document.getElementById("root")!).render(
    <AuthProvider {...oidcConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  );
