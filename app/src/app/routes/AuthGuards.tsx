import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isAuthenticated) {
    // Redirect them to the / login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const [searchParams] = useSearchParams();

  if (auth.isAuthenticated) {
    // A user who's already signed in (e.g. clicking an email CTA from their phone with the
    // app already open) still needs to land on the intended destination, not just /baules —
    // otherwise every deep link that carries a redirectTo is silently dropped for anyone
    // with an active session.
    return <Navigate to={searchParams.get('redirectTo') || '/baules'} replace />;
  }

  return <>{children}</>;
};
