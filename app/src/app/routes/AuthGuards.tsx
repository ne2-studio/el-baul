import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const location = useLocation();

  // auth.isAuthenticated starts false while the OIDC user is still being rehydrated from
  // localStorage (see main.tsx's WebStorageStateStore) — without this guard, a hard refresh
  // on a protected URL would bounce straight to "/" before rehydration even had a chance to
  // resolve, even though the session is actually still valid.
  if (auth.isLoading) return null;

  if (!auth.isAuthenticated) {
    // Send them to the / login page carrying where they were trying to go as ?redirectTo=,
    // the same query param WelcomeRoute already reads to kick off signinRedirect — so any
    // protected URL (not just the hand-rolled invite/onboarding flows) survives a login round trip.
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?redirectTo=${redirectTo}`} replace />;
  }

  return <>{children}</>;
};

export const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const [searchParams] = useSearchParams();

  if (auth.isLoading) return null;

  if (auth.isAuthenticated) {
    // A user who's already signed in (e.g. clicking an email CTA from their phone with the
    // app already open) still needs to land on the intended destination, not just /baules —
    // otherwise every deep link that carries a redirectTo is silently dropped for anyone
    // with an active session.
    return <Navigate to={searchParams.get('redirectTo') || '/baules'} replace />;
  }

  return <>{children}</>;
};
