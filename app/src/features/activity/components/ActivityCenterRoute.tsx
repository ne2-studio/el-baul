import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityCenter } from '@/app/components/ActivityCenter';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';

export const ActivityCenterRoute: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { activities, baules, loadAlbums: storeLoadAlbums } = useAppStore();
  const auth = useAuth();
  const { showToastMessage } = useUIStore();

  const handleViewBaul = async (baulId: string) => {
    if (!auth.isAuthenticated) return;
    const baul = baules.find(b => b.id === baulId);
    if (!baul) return;

    try {
      setIsLoading(true);
      await storeLoadAlbums(baul.id);
      navigate(`/baules/${baul.id}`);
    } catch (error) {
      console.error('Error loading baul from activity:', error);
      showToastMessage('Error al cargar el baúl');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ActivityCenter
        activities={activities}
        onBack={() => navigate('/baules')}
        onViewBaul={handleViewBaul}
        onReviewRemovalRequest={(baulId) => navigate(`/eliminar-solicitudes/${baulId}`)}
        onManageAccessRequest={(baulId) => navigate(`/solicitudes/${baulId}`)}
      />
      
      {isLoading && (
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
