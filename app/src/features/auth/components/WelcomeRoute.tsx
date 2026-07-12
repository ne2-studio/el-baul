import React from 'react';
import { WelcomeScreen } from '@/app/components/WelcomeScreen';
import { signInWithGoogle } from '@/services/auth.service';
import { useUIStore } from '@/store/uiStore';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const WelcomeRoute: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  
  const redirectTo = searchParams.get('redirectTo');

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle(redirectTo || undefined);
    } catch (error) {
      console.error('Error signing in:', error);
      showToastMessage('Error al iniciar sesión');
      navigate('/');
    }
  };

  return <WelcomeScreen onGoogleSignIn={handleGoogleSignIn} />;
};
