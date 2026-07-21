import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { Layout } from './app/components/Layout';
import { AdminRoute } from './routes/AuthGuards';
import { setAccessToken } from './api';
import { DashboardRoute } from './features/dashboard/components/DashboardRoute';
import { UsersListRoute } from './features/users/components/UsersListRoute';
import { UserDetailRoute } from './features/users/components/UserDetailRoute';
import { BaulesListRoute } from './features/baules/components/BaulesListRoute';
import { BaulDetailRoute } from './features/baules/components/BaulDetailRoute';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
}

export default function App() {
  const auth = useAuth();

  useEffect(() => {
    setAccessToken(auth.user?.access_token);
  }, [auth.user]);

  // Unlike app/, the admin backoffice has no public routes to fall back to — an
  // unauthenticated visitor goes straight to Zitadel.
  useEffect(() => {
    const isCallback = window.location.pathname === '/callback';
    if (!auth.isLoading && !auth.isAuthenticated && !isCallback) {
      auth.signinRedirect();
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  const handleLogout = async () => {
    await auth.signoutRedirect();
  };

  if (auth.isLoading || !auth.isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <Layout onLogout={handleLogout}>
      <Routes>
        <Route path="/callback" element={null} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<AdminRoute><DashboardRoute /></AdminRoute>} />
        <Route path="/usuarios" element={<AdminRoute><UsersListRoute /></AdminRoute>} />
        <Route path="/usuarios/:userId" element={<AdminRoute><UserDetailRoute /></AdminRoute>} />
        <Route path="/baules" element={<AdminRoute><BaulesListRoute /></AdminRoute>} />
        <Route path="/baules/:baulId" element={<AdminRoute><BaulDetailRoute /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
