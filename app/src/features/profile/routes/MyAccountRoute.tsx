import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MyAccountScreen } from '@/features/profile/components/MyAccountScreen';

interface MyAccountRouteProps {
  // Sign-out spans the whole app session (resets every store, redirects through the OIDC
  // provider's end_session) — that lifecycle stays owned by App.tsx (see handleSignOut there),
  // same pattern as UploadErrorRoute's `navigate` prop. This Route only wires the screen and
  // its own in-page navigation.
  onSignOut: () => void;
  isSigningOut?: boolean;
}

export const MyAccountRoute: React.FC<MyAccountRouteProps> = ({ onSignOut, isSigningOut }) => {
  const navigate = useNavigate();

  return (
    <MyAccountScreen
      onBack={() => navigate('/baules')}
      onNavigateToProfile={() => navigate('/perfil')}
      onNavigateToNotifications={() => navigate('/configuracion/notificaciones')}
      onSignOut={onSignOut}
      isSigningOut={isSigningOut}
    />
  );
};
