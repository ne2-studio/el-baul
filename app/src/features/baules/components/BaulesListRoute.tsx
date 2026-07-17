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
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const auth = useAuth();
  const monetizationEnabled = useAppConfigStore(state => state.monetizationEnabled);

  const {
    baules,
    loadAlbums: storeLoadAlbums,
    loadLoosePhotos,
    subscription,
    isLoading
  } = useAppStore();

  const {
    showToastMessage,
    setShowPlanLimitModal
  } = useUIStore();

  const handleSelectBaul = async (baul: Baul) => {
    if (!auth.isAuthenticated) return;

    try {
      setIsLoadingAlbums(true);
      await Promise.all([storeLoadAlbums(baul.id), loadLoosePhotos(baul.id)]);
      navigate(`/baules/${baul.id}`);
    } catch (error) {
      console.error('Error loading albums:', error);
      showToastMessage('Error al cargar los álbumes');
    } finally {
      setIsLoadingAlbums(false);
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
        baulesUsed={subscription.baulesUsed}
        baulesLimit={subscription.baulesLimit}
      />
      
      {isLoadingAlbums && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 shadow-2xl border border-border">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-foreground font-medium">Cargando baúl...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
