import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';

export const CallbackRoute: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (auth.isAuthenticated) {
      // This route is only reached via the OIDC provider's redirect back after an actual
      // login — a rehydrated/persisted session on page reload never routes through here — so
      // this fires exactly once per real sign-in, not on every app load.
      posthog.capture('user_signed_in');
      const redirectTo = (auth.user?.state as { redirectTo?: string } | undefined)?.redirectTo;
      navigate(redirectTo || '/baules', { replace: true });
      return;
    }

    // post_logout_redirect_uri del proveedor OIDC apunta a esta misma ruta (ver main.tsx):
    // un regreso de end_session llega aquí sin `code`, así que no hay nada que procesar —
    // sin este chequeo se queda colgado en el spinner para siempre.
    if (!auth.isLoading && !searchParams.has('code')) {
      navigate('/', { replace: true });
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.user, navigate, searchParams]);

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
