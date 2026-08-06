import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaulesLoadingScreen } from '@/features/baules/components/BaulesLoadingScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { resolveHomeDestination } from '@/features/baules/useCases';

// "/baules" ya no lista baúles — es el punto de entrada al que sigue apuntando cerca de una
// decena de sitios ("volver a casa" desde Ayuda/Perfil/Suscripción/Compartir, CallbackRoute,
// PublicRoute, etc.). Esta ruta solo resuelve el CurrentBaul (o el primer baúl, o
// onboarding/crear-baúl si no hay ninguno) y redirige — ver resolveHomeDestination.
export const HomeRedirectRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baules, isLoading } = useBaulesStore();

  useEffect(() => {
    if (isLoading) return;
    navigate(resolveHomeDestination(baules), { replace: true });
  }, [isLoading, baules, navigate]);

  return <BaulesLoadingScreen />;
};
