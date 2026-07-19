import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { ShareTargetBaulScreen } from '@/app/components/ShareTargetBaulScreen';
import { useAppStore } from '@/store/useAppStore';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';
import { useUIStore } from '@/store/uiStore';
import { ShareReceiver } from '@/native/shareReceiver';
import { Baul } from '@/types';

export const SelectBaulForShareRoute: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { baules, loadLoosePhotos } = useAppStore();
  const { share, selectedPhotos, clear } = useIncomingShareStore();
  const showToastMessage = useUIStore((state) => state.showToastMessage);

  if (!share || selectedPhotos.length === 0) {
    return <Navigate to="/baules" replace />;
  }

  const handleSelectBaul = async (baul: Baul) => {
    try {
      setIsLoading(true);
      await loadLoosePhotos(baul.id);
      navigate(`/baules/${baul.id}/fotos-sueltas/confirmar`, { state: { selectedPhotos } });
      clear();
    } catch (error) {
      console.error('Error preparing shared photos:', error);
      showToastMessage('Error al preparar las fotos compartidas');
    } finally {
      setIsLoading(false);
    }

    // Housekeeping del plugin nativo — no debe bloquear ni fallar visiblemente la
    // navegación de arriba, que ya completó lo que le importa al usuario.
    ShareReceiver.clearPendingShare().catch((error) => Sentry.captureException(error));
  };

  const handleCancel = () => {
    ShareReceiver.clearPendingShare().catch((error) => Sentry.captureException(error));
    clear();
    navigate('/baules');
  };

  return (
    <ShareTargetBaulScreen
      baules={baules}
      photoCount={selectedPhotos.length}
      onSelectBaul={handleSelectBaul}
      onCancel={handleCancel}
      isLoading={isLoading}
    />
  );
};
