import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import { WebStorageStateStore } from 'oidc-client-ts';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './styles/index.css';

const organizationId = import.meta.env.VITE_ZITADEL_ORGANIZATION_ID as string;

const oidcConfig = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY as string,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID as string,
  redirect_uri: import.meta.env.VITE_OIDC_CALLBACK_URI as string,
  // urn:zitadel:iam:org:project:role:admin is what makes Zitadel include the caller's project
  // roles on the token — needed here (unlike the consumer app) so the backend's AdminOnly
  // policy has something to check.
  scope: `openid profile email urn:zitadel:iam:org:id:${organizationId} urn:zitadel:iam:org:project:role:admin`,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, '/');
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
