import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import { BaulIcon } from '@/app/components/BaulIcon';

export const CallbackRoute: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated) {
      const redirectTo = (auth.user?.state as { redirectTo?: string } | undefined)?.redirectTo;
      navigate(redirectTo || '/baules', { replace: true });
    }
  }, [auth.isAuthenticated, auth.user, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* App Icon with animation */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-lg animate-pulse">
            <BaulIcon className="w-12 h-12 text-primary-foreground" />
          </div>
        </div>

        {/* Loading text */}
        <p className="text-lg text-muted-foreground">
          Preparando tus baúles…
        </p>
      </div>
    </div>
  );
};
