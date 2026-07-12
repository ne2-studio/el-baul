import React, { useEffect } from 'react';
import { Archive } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '@/services/base';

export const AuthLoadingRoute: React.FC = () => {
  const accessToken = useAuthStore(state => state.accessToken);
  const setAccessToken = useAuthStore(state => state.setAccessToken);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const redirectTo = searchParams.get('redirectTo');

  useEffect(() => {
    // Si llegamos aquí con un hash (access_token), Supabase debería haberlo procesado
    // Pero forzamos una comprobación de sesión por si acaso
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !accessToken) {
        setAccessToken(session.access_token);
      }
    };

    if (location.hash || location.search.includes('error=')) {
      checkSession();
    }
  }, [location.hash, location.search, accessToken, setAccessToken]);

  if (accessToken) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return <Navigate to="/baules" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* App Icon with animation */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-lg animate-pulse">
            <Archive className="w-12 h-12 text-primary-foreground" strokeWidth={1.5} />
          </div>
        </div>
        
        {/* Loading text */}
        <p className="text-lg text-muted-foreground">
          Preparando tu baúl…
        </p>
      </div>
    </div>
  );
};
