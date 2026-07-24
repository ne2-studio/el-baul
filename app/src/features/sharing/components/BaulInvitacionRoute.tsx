import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvitacionScreen } from '@/app/components/InvitacionScreen';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/api';
import { BaulPreview } from '@/types';

export const BaulInvitacionRoute: React.FC = () => {
  const navigate = useNavigate();
  const { personaId } = useParams<{ personaId: string }>();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const [preview, setPreview] = useState<BaulPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!personaId) return;

      try {
        setLoading(true);
        // Obtener el preview de la invitación personal en una sola llamada dedicada (endpoint público)
        const previewData = await api.personas.getInvitePreview(personaId);
        setPreview(previewData);
      } catch (error) {
        console.error('Error loading invitation data:', error);
        showToastMessage('Error al cargar la invitación');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [personaId, showToastMessage]);

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
        <p className="text-muted-foreground mb-8">Este enlace de invitación no es válido o ya ha sido usado.</p>
        <button
          onClick={() => navigate('/baules')}
          className="text-primary hover:underline"
        >
          Ir a mis baúles
        </button>
      </div>
    );
  }

  const handleUnirme = () => {
    if (!auth.isAuthenticated) {
      // Si no hay sesión, redirigir al login con redirectTo al proceso de aceptar invitación
      navigate(`/?redirectTo=${encodeURIComponent(`/invitacion/persona/${personaId}/aceptar`)}`);
      return;
    }
    navigate(`/invitacion/persona/${personaId}/aceptar`);
  };

  const handleVerMas = () => {
    const params = new URLSearchParams();
    if (preview) {
      params.set('baulNombre', preview.name);
      params.set('baulId', preview.id);
    }

    const onboardingUrl = `/onboarding?${params.toString()}`;

    // El onboarding ahora es público, no hace falta forzar login aquí.
    // Al final del onboarding ya se pedirá login si es necesario.
    navigate(onboardingUrl);
  };

  return (
    <InvitacionScreen
      baulNombre={preview.name}
      personaNickname={preview.personaNickname}
      previewPhotos={preview.previewPhotos}
      onUnirme={handleUnirme}
      onVerMas={handleVerMas}
    />
  );
};
