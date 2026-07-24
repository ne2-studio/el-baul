import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreateBaulForm } from '@/app/components/CreateBaulForm';
import { useAuthStore } from '@/store/useAuthStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';

export const CreateBaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const { setSubscription } = useAuthStore();
  const { baules, createBaul: storeCreateBaul } = useBaulesStore();
  const { showToastMessage } = useUIStore();
  const { run, isPending } = useAsyncAction();

  const isOnboarding = new URLSearchParams(location.search).get('onboarding') === 'true';

  const handleCreateBaul = async (name: string, description: string) => {
    if (!auth.isAuthenticated) return;

    const isFirstBaul = baules.length === 0;
    const result = await run(() => storeCreateBaul(name, description), {
      errorMessage: 'Error al crear el baúl',
    });
    if (!result.ok) return;

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

  return (
    <CreateBaulForm
      onBack={() => navigate('/baules')}
      onSubmit={handleCreateBaul}
      isOnboarding={isOnboarding}
      isSubmitting={isPending()}
    />
  );
};
