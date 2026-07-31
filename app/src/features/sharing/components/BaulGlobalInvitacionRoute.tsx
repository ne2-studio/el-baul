import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvitacionScreen } from '@/features/sharing/components/InvitacionScreen';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/api';
import { BaulInviteLinkPreview } from '@/types';
import { Button } from '@/design-system/components/actions/Button';

export const BaulGlobalInvitacionRoute: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const [preview, setPreview] = useState<BaulInviteLinkPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!token) return;

      try {
        setLoading(true);
        const previewData = await api.baulInvites.getPreview(token);
        setPreview(previewData);
      } catch (error) {
        console.error('Error loading invitation data:', error);
        showToastMessage('Error al cargar la invitación', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token, showToastMessage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Invitación no encontrada</h1>
        <p className="text-muted-foreground mb-8">Este enlace de invitación no es válido o ha sido regenerado.</p>
        <Button variant="plain"
          onClick={() => navigate('/baules')}
          className="text-primary hover:underline"
        >
          Ir a mis baúles
        </Button>
      </div>
    );
  }

  const handleUnirme = () => {
    if (!auth.isAuthenticated) {
      navigate(`/?redirectTo=${encodeURIComponent(`/invitacion/baul/${token}/aceptar`)}`);
      return;
    }
    navigate(`/invitacion/baul/${token}/aceptar`);
  };

  const handleVerMas = () => {
    const params = new URLSearchParams();
    if (preview) {
      params.set('baulNombre', preview.name);
      params.set('baulId', preview.baulId);
    }

    const onboardingUrl = `/onboarding?${params.toString()}`;

    // El onboarding ahora es público, no hace falta forzar login aquí.
    // Al final del onboarding ya se pedirá login si es necesario.
    navigate(onboardingUrl);
  };

  return (
    <InvitacionScreen
      baulNombre={preview.name}
      previewPhotos={preview.previewPhotos}
      onUnirme={handleUnirme}
      onVerMas={handleVerMas}
    />
  );
};
