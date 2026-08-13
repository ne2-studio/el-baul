import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Tv } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { BaulesLoadingScreen } from '@/features/baules/components/BaulesLoadingScreen';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';
import { TvPairingBaulPickerScreen } from '@/features/tv/components/TvPairingBaulPickerScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useUIStore } from '@/store/uiStore';
import { api, isApiErrorWithStatus } from '@/api';
import { Baul } from '@/types';

type Screen =
  | { status: 'picking' }
  | { status: 'claiming' }
  | { status: 'expired' }
  | { status: 'done'; baulName: string };

// The phone side of scanning the TV's QR code (see docs PRD "Modo TV" and TvLandingRoute).
// Reached from a plain https URL, so it's a protected route like any other — ProtectedRoute
// already carries an unauthenticated visitor through login and back here via ?redirectTo.
export function TvPairingRoute() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const { baules, isLoading: isLoadingBaules } = useBaulesStore();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const [screen, setScreen] = useState<Screen>({ status: 'picking' });

  if (isLoadingBaules) {
    return <BaulesLoadingScreen />;
  }

  const handleSelectBaul = async (baul: Baul) => {
    if (!code) return;

    setScreen({ status: 'claiming' });
    try {
      await api.tvPairings.claim(code, baul.id);
      setScreen({ status: 'done', baulName: baul.name });
    } catch (error) {
      if (isApiErrorWithStatus(error, 404)) {
        setScreen({ status: 'expired' });
        return;
      }
      showToastMessage('Error al vincular la TV', 'error');
      setScreen({ status: 'picking' });
    }
  };

  if (screen.status === 'expired') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <EmptyState
            icon={<Tv className="w-12 h-12" />}
            title="Este código ya no es válido"
            subtitle="Vuelve a la TV y escanea el código que se muestra ahora en pantalla."
          />
          <div className="mt-2 flex justify-center">
            <Button onClick={() => navigate('/baules')}>Volver a mis baúles</Button>
          </div>
        </div>
      </main>
    );
  }

  if (screen.status === 'done') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <EmptyState
            icon={<CheckCircle2 className="w-12 h-12" />}
            title="Ya se está mostrando en tu TV"
            subtitle={`"${screen.baulName}" se está viendo ahora en el televisor.`}
          />
          <div className="mt-2 flex justify-center">
            <Button onClick={() => navigate('/baules')}>Volver a mis baúles</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <TvPairingBaulPickerScreen
        baules={baules}
        onSelectBaul={handleSelectBaul}
        onCancel={() => navigate('/baules')}
        isLoading={screen.status === 'claiming'}
      />

      {screen.status === 'claiming' && <BlockingLoadingOverlay message="Vinculando con la TV..." />}
    </>
  );
}
