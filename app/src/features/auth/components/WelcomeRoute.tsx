import React from 'react';
import { WelcomeScreen } from '@/features/auth/components/WelcomeScreen';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { useSearchParams } from 'react-router-dom';

export const WelcomeRoute: React.FC = () => {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const redirectTo = searchParams.get('redirectTo');

  const handleSignIn = async () => {
    try {
      // select_account fuerza el selector de cuentas de Google incluso si ya hay una
      // sesión (de Google o de Zitadel) activa, para poder volver a elegir con qué
      // cuenta entrar en vez de reengancharse en silencio a la última usada.
      await auth.signinRedirect({
        state: { redirectTo: redirectTo || undefined },
        prompt: 'select_account',
      });
    } catch (error) {
      console.error('Error signing in:', error);
      showToastMessage('Error al iniciar sesión', 'error');
    }
  };

  return <WelcomeScreen onGoogleSignIn={handleSignIn} />;
};
