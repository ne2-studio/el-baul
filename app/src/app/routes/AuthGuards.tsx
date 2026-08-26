import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { FullScreenLoading } from '@/design-system/components/feedback/FullScreenLoading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Auth-only guard, used by every protected route (including /compartir itself). The pending
// native-share redirect used to live partly in here (see git history / CHANGELOG for the
// pendingShareGate.ts removal) — it now lives entirely in App.tsx, next to backgroundLocation,
// as a single render-time check that isn't tied to which guard happens to be mounted.
export const RequireAuth: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const location = useLocation();

  // auth.isAuthenticated starts false while the OIDC user is still being rehydrated from
  // localStorage (see main.tsx's WebStorageStateStore) — without this guard, a hard refresh
  // on a protected URL would bounce straight to "/" before rehydration even had a chance to
  // resolve, even though the session is actually still valid. Rendering FullScreenLoading
  // (instead of null) gives feedback immediately on cold start — e.g. opening the app via
  // Android's share sheet — rather than an unstyled gap.
  if (auth.isLoading) return <FullScreenLoading message="Cargando…" />;

  if (!auth.isAuthenticated) {
    // Send them to the / login page carrying where they were trying to go as ?redirectTo=,
    // the same query param WelcomeRoute already reads to kick off signinRedirect — so any
    // protected URL (not just the hand-rolled invite/onboarding flows) survives a login round trip.
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?redirectTo=${redirectTo}`} replace />;
  }

  return <>{children}</>;
};

// Plain auth guard: use for every protected route. A pending native share, if any, is handled by
// App.tsx's own render-time redirect — it wins over whatever this route would normally render
// regardless of which guard is mounted, so this component doesn't need to know about it at all.
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  return <RequireAuth>{children}</RequireAuth>;
};

export const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const [searchParams] = useSearchParams();

  if (auth.isLoading) return <FullScreenLoading message="Cargando…" />;

  if (auth.isAuthenticated) {
    // A user who's already signed in (e.g. clicking an email CTA from their phone with the
    // app already open) still needs to land on the intended destination, not just /baules —
    // otherwise every deep link that carries a redirectTo is silently dropped for anyone
    // with an active session. (A pending native share overriding this is App.tsx's job, same
    // as for ProtectedRoute above.)
    return <Navigate to={searchParams.get('redirectTo') || '/baules'} replace />;
  }

  return <>{children}</>;
};
