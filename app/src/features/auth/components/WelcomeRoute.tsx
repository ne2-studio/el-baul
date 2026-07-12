import React from 'react';
import { WelcomeScreen } from '@/app/components/WelcomeScreen';
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
      await auth.signinRedirect({ state: { redirectTo: redirectTo || undefined } });
    } catch (error) {
      console.error('Error signing in:', error);
      showToastMessage('Error al iniciar sesión');
    }
  };

  return <WelcomeScreen onGoogleSignIn={handleSignIn} />;
};
