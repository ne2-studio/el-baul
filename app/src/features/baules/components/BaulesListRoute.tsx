import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaulesList } from '@/app/components/BaulesList';
import { BaulesLoadingScreen } from '@/app/components/BaulesLoadingScreen';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { Baul } from '@/types';

export const BaulesListRoute: React.FC = () => {
  const navigate = useNavigate();
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const auth = useAuth();
  const monetizationEnabled = useAppConfigStore(state => state.monetizationEnabled);

  const {
    baules,
    loadChapters: storeLoadChapters,
    loadLoosePhotos,
    loadBaulRecuerdos,
    subscription,
    isLoading
  } = useAppStore();

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
      showToastMessage('Error al cargar los capítulos');
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const handleCreateBaulClick = () => {
    if (monetizationEnabled) {
      const custodianBaules = baules.filter(b => b.isCustodio !== false);
      if (custodianBaules.length >= subscription.baulesLimit) {
        setShowPlanLimitModal(true);
        return;
      }
    }
    navigate('/baules/nuevo');
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
      
      {isLoadingChapters && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 shadow-2xl border border-border">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-foreground font-medium">Abriendo baúl...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
