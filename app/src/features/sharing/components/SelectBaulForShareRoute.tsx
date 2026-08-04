import React, { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { ShareTargetBaulScreen } from '@/features/sharing/components/ShareTargetBaulScreen';
import { BaulesLoadingScreen } from '@/features/baules/components/BaulesLoadingScreen';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';
import { useUIStore } from '@/store/uiStore';
import { clear } from '@/features/sharing/useCases';
import { loadChapters } from '@/features/baules/useCases';
import { loadLoosePhotos } from '@/features/photos/useCases';
import { ShareReceiver } from '@/features/sharing/native/shareReceiver';
import { Baul } from '@/types';

export const SelectBaulForShareRoute: React.FC = () => {
  const navigate = useNavigate();
  const [isOpeningBaul, setIsOpeningBaul] = useState(false);
  const { baules, isLoading: isLoadingBaules } = useBaulesStore();
  const { share, selectedPhotos } = useIncomingShareStore();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  // clear() vacía este store en cuanto se elige baúl, lo que re-renderiza este mismo
  // componente (sigue montado hasta que el router aplique el navigate) — sin este flag,
  // ese re-render vuelve a evaluar el guard de abajo con el store ya vacío y redirige a
  // "/baules", secuestrando la navegación a la pantalla de confirmación que ya se pidió.
  const hasNavigatedRef = useRef(false);

  if (!hasNavigatedRef.current && (!share || selectedPhotos.length === 0)) {
    return <Navigate to="/baules" replace />;
  }

  // Los baúles se cargan una vez al autenticarse, en paralelo con el arranque de esta
  // pantalla — sin este guard, un intent de compartir en frío ve un parpadeo del estado
  // vacío ("Aún no tienes baúles") antes de que la lista real llegue.
  if (isLoadingBaules) {
    return <BaulesLoadingScreen />;
  }

  const handleSelectBaul = async (baul: Baul) => {
    try {
      setIsOpeningBaul(true);
      await Promise.all([loadChapters(baul.id), loadLoosePhotos(baul.id)]);
      hasNavigatedRef.current = true;
      navigate(`/baules/${baul.id}/fotos-sueltas/confirmar`, { state: { selectedPhotos } });
      clear();
    } catch (error) {
      console.error('Error preparing shared photos:', error);
      showToastMessage('Error al preparar las fotos compartidas', 'error');
    } finally {
      setIsOpeningBaul(false);
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
    <>
      <ShareTargetBaulScreen
        baules={baules}
        photoCount={selectedPhotos.length}
        onSelectBaul={handleSelectBaul}
        onCancel={handleCancel}
        isLoading={isOpeningBaul}
      />

      {isOpeningBaul && <BlockingLoadingOverlay message="Abriendo baúl..." />}
    </>
  );
};
