import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaulesList } from '@/features/baules/components/BaulesList';
import { BaulesLoadingScreen } from '@/features/baules/components/BaulesLoadingScreen';
import { CreateBaulModal } from '@/features/baules/components/CreateBaulModal';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';
import { useAuthStore } from '@/store/useAuthStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { loadBaulRecuerdos } from '@/features/memories/useCases';
import { createBaul as storeCreateBaul, loadChapters as storeLoadChapters } from '@/features/baules/useCases';
import { loadLoosePhotos } from '@/features/photos/useCases';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { Baul } from '@/types';
import { getBaulPermissions } from '@/utils/roleUtils';
import { useAsyncAction } from '@/hooks/useAsyncAction';

export const BaulesListRoute: React.FC = () => {
  const navigate = useNavigate();
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [showCreateBaulModal, setShowCreateBaulModal] = useState(false);
  const auth = useAuth();
  const monetizationEnabled = useAppConfigStore(state => state.monetizationEnabled);
  const { run, isPending } = useAsyncAction();

  const { baules, isLoading } = useBaulesStore();
  const { subscription, setSubscription } = useAuthStore();

  const {
    showToastMessage,
    setShowPlanLimitModal,
    setShowProfileMenu
  } = useUIStore();

  const handleSelectBaul = async (baul: Baul) => {
    if (!auth.isAuthenticated) return;

    try {
      setIsLoadingChapters(true);
      // Prefetches everything BaulRoute's own init effect would otherwise need to load on
      // mount (see its comment) — keeping this in sync with that list matters: if this ever
      // fetches less than BaulRoute checks for, opening a baúl shows this "Abriendo baúl..."
      // overlay and then, right after, BaulRoute's own "Cargando..." screen for whatever
      // wasn't prefetched here — two different loading treatments back to back that read as
      // a flicker/glitch (missed when the recuerdos tab was added: this call still only
      // prefetched chapters/loosePhotos, not baulRecuerdos).
      await Promise.all([storeLoadChapters(baul.id), loadLoosePhotos(baul.id), loadBaulRecuerdos(baul.id)]);
      navigate(`/baules/${baul.id}`);
    } catch (error) {
      console.error('Error loading chapters:', error);
      showToastMessage('Error al cargar los capítulos', 'error');
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const handleCreateBaulClick = () => {
    if (monetizationEnabled) {
      const custodianBaules = baules.filter(b => getBaulPermissions(b).countsAsCustodioForPlan);
      if (custodianBaules.length >= subscription.baulesLimit) {
        setShowPlanLimitModal(true);
        return;
      }
    }
    setShowCreateBaulModal(true);
  };

  const handleCreateBaul = async (name: string, description: string) => {
    if (!auth.isAuthenticated) return;

    const isFirstBaul = baules.length === 0;
    const result = await run(() => storeCreateBaul(name, description), {
      key: 'create-baul',
      errorMessage: 'Error al crear el baúl',
    });
    if (!result.ok) return;

    setShowCreateBaulModal(false);
    setSubscription(prev => ({
      ...prev,
      baulesUsed: prev.baulesUsed + 1
    }));

    navigate(`/baules/${result.value.id}`);

    if (isFirstBaul) {
      setTimeout(() => {
        showToastMessage('Tus recuerdos ya están a salvo');
      }, 300);
    }
  };

  if (isLoading) {
    return <BaulesLoadingScreen />;
  }

  return (
    <>
      <BaulesList
        baules={baules}
        onSelectBaul={handleSelectBaul}
        onCreateBaul={handleCreateBaulClick}
        onOpenProfileMenu={() => setShowProfileMenu(true)}
        baulesUsed={subscription.baulesUsed}
        baulesLimit={subscription.baulesLimit}
        monetizationEnabled={monetizationEnabled}
      />
      
      {isLoadingChapters && <BlockingLoadingOverlay message="Abriendo baúl..." />}

      {showCreateBaulModal && (
        <CreateBaulModal
          onCancel={() => setShowCreateBaulModal(false)}
          onSave={handleCreateBaul}
          isSubmitting={isPending('create-baul')}
        />
      )}
    </>
  );
};
