import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyBaulesScreen } from '@/features/baules/components/EmptyBaulesScreen';
import { CreateBaulModal } from '@/features/baules/components/CreateBaulModal';
import { useAuthStore } from '@/store/useAuthStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';

export const EmptyBaulesRoute: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [showCreateBaulModal, setShowCreateBaulModal] = useState(false);
  const { createBaul } = useBaulesStore();
  const { setSubscription } = useAuthStore();
  const { showToastMessage } = useUIStore();
  const { run, isPending } = useAsyncAction();

  const handleCreateBaul = async (name: string, description: string) => {
    if (!auth.isAuthenticated) return;

    const result = await run(() => createBaul(name, description), {
      key: 'create-first-baul',
      errorMessage: 'Error al crear el baúl',
    });
    if (!result.ok) return;

    setShowCreateBaulModal(false);
    setSubscription(prev => ({
      ...prev,
      baulesUsed: prev.baulesUsed + 1
    }));
    navigate(`/baules/${result.value.id}`);

    setTimeout(() => {
      showToastMessage('Tus recuerdos ya están a salvo');
    }, 300);
  };

  return (
    <>
      <EmptyBaulesScreen onCreateFirstBaul={() => setShowCreateBaulModal(true)} />
      {showCreateBaulModal && (
        <CreateBaulModal
          onCancel={() => setShowCreateBaulModal(false)}
          onSave={handleCreateBaul}
          isOnboarding
          isSubmitting={isPending('create-first-baul')}
        />
      )}
    </>
  );
};
