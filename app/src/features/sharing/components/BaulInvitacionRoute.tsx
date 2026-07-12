import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvitacionScreen } from '@/app/components/InvitacionScreen';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getBaulPreview } from '@/services/baules.service';
import { BaulPreview } from '@/types';

export const BaulInvitacionRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams<{ baulId: string }>();
  const accessToken = useAuthStore(state => state.accessToken);
  const showToastMessage = useUIStore(state => state.showToastMessage);
  
  const [preview, setPreview] = useState<BaulPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!baulId) return;
      
      try {
        setLoading(true);
        // Obtener el preview del baúl en una sola llamada dedicada
        const previewData = await getBaulPreview(accessToken || '', baulId);
        setPreview(previewData);
      } catch (error) {
        console.error('Error loading invitation data:', error);
        showToastMessage('Error al cargar la invitación');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [baulId, accessToken, showToastMessage]);

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
        <p className="text-muted-foreground mb-8">No hemos podido encontrar el baúl al que has sido invitado.</p>
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
    if (!accessToken) {
      // Si no hay sesión, redirigir al login con redirectTo al proceso de aceptar invitación
      navigate(`/?redirectTo=${encodeURIComponent(`/invitacion/${baulId}/aceptar`)}`);
      return;
    }
    navigate(`/invitacion/${baulId}/aceptar`);
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
      previewPhotos={preview.previewPhotos}
      onUnirme={handleUnirme}
      onVerMas={handleVerMas}
    />
  );
};
