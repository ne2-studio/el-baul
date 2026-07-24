import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import { WebStorageStateStore } from 'oidc-client-ts';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './styles/index.css';
import { getEnv } from './runtimeConfig';

const organizationId = getEnv('VITE_ZITADEL_ORGANIZATION_ID');

const oidcConfig = {
  authority: getEnv('VITE_OIDC_AUTHORITY'),
  client_id: getEnv('VITE_OIDC_CLIENT_ID'),
  redirect_uri: getEnv('VITE_OIDC_CALLBACK_URI'),
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
