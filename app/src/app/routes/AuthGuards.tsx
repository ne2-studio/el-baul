import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { FullScreenLoading } from '@/design-system/components/feedback/FullScreenLoading';
import { usePendingShareGate } from '@/features/sharing/native/pendingShareGate';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Auth-only guard: no pending-share redirect. Use this (instead of ProtectedRoute) for any
// route that a pending share can itself resolve to — currently just /compartir. ProtectedRoute's
// "hasPendingShare -> Navigate('/compartir')" would otherwise redirect that route to itself on
// every render, since it never learns it's already there: SelectBaulForShareRoute (the only
// place that clears the pending share) would never get a chance to mount, trapping the user on
// a blank screen with no way out. See CHANGELOG for the regression this fixes.
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

// Auth guard + pending-share redirect: use for every protected route except /compartir itself
// (see RequireAuth above for why /compartir is special-cased).
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const { isChecking: isCheckingPendingShare, hasPendingShare } = usePendingShareGate(auth.isAuthenticated);

  return (
    <RequireAuth>
      {(() => {
        // See pendingShareGate.ts: on native Android, a pending share must win over whatever
        // this route would normally render, so a share-sheet cold start (or a share arriving
        // while already past "/") lands on /compartir without ever rendering a baúl in between.
        if (isCheckingPendingShare) return <FullScreenLoading message="Cargando…" />;
        if (hasPendingShare) return <Navigate to="/compartir" replace />;
        return children;
      })()}
    </RequireAuth>
  );
};

export const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const { isChecking: isCheckingPendingShare, hasPendingShare } = usePendingShareGate(auth.isAuthenticated);

  if (auth.isLoading) return <FullScreenLoading message="Cargando…" />;

  if (auth.isAuthenticated) {
    // See pendingShareGate.ts: this must resolve before committing to the normal authenticated
    // destination below — otherwise an Android share-sheet cold start reliably wins the race and
    // flashes the default baúl before the app catches up and navigates to /compartir.
    if (isCheckingPendingShare) return <FullScreenLoading message="Cargando…" />;
    if (hasPendingShare) return <Navigate to="/compartir" replace />;

    // A user who's already signed in (e.g. clicking an email CTA from their phone with the
    // app already open) still needs to land on the intended destination, not just /baules —
    // otherwise every deep link that carries a redirectTo is silently dropped for anyone
    // with an active session.
    return <Navigate to={searchParams.get('redirectTo') || '/baules'} replace />;
  }

  return <>{children}</>;
};
