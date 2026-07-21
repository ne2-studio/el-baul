import React from 'react';
import { useAuth } from 'react-oidc-context';
import { hasAdminRole } from '@/utils/roles';
import { AccessDenied } from '@/app/components/AccessDenied';

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
