import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import { hasAdminRole } from '@/utils/roles';
import { AccessDenied } from '@/app/components/AccessDenied';

// main.tsx's onSigninCallback calls the raw `window.history.replaceState` API to drop the
// OIDC ?code=/&state= query string after login. React Router never observes a raw
// replaceState call (no popstate fires), so its internal location stays stuck at
// "/callback" even though the address bar now shows "/" — the "/" route's <Navigate
// to="/dashboard"/> never gets a chance to match, and the app sits on a blank page until
// the user happens to click a sidebar link (which goes through Router's own navigate() and
// resyncs it). Rendering this at the /callback route and calling navigate() ourselves fixes
// the resync deterministically instead of relying on a lucky manual click. Same underlying
// bug the consumer app dodges via its own CallbackRoute (app/src/features/auth/components/
// CallbackRoute.tsx) — this is the admin backoffice's equivalent.
export const CallbackRoute: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [auth.isAuthenticated, navigate]);

  return null;
};

interface GuardProps {
  children: React.ReactNode;
}

// Unlike app/'s ProtectedRoute, this never redirects — App.tsx's top-level effect already
// sends an unauthenticated user straight to auth.signinRedirect() before any route renders
// (the admin backoffice has no public routes to redirect to instead).
export const ProtectedRoute: React.FC<GuardProps> = ({ children }) => {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

// The real access-control boundary is server-side (AdminOnly policy on every /api/admin/*
// endpoint) — this is a UX gate so a signed-in-but-non-admin El Baúl user sees a clear
// message instead of a screen full of failed requests.
export const AdminRoute: React.FC<GuardProps> = ({ children }) => {
  const auth = useAuth();

  return (
    <ProtectedRoute>
      {hasAdminRole(auth.user?.profile) ? <>{children}</> : <AccessDenied />}
    </ProtectedRoute>
  );
};
