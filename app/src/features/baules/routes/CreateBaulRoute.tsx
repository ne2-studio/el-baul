import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateBaulForm } from '@/features/baules/components/CreateBaulForm';
import { useAuthStore } from '@/store/useAuthStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { createBaul as storeCreateBaul } from '@/features/baules/useCases';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';

function suggestBaulName(userFullName: string): string {
  const lastName = userFullName.trim().split(/\s+/).pop();
  return lastName ? `Familia ${lastName}` : 'Nuestra Familia';
}

export const CreateBaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const { userProfile, setSubscription } = useAuthStore();
  const { baules } = useBaulesStore();
  const { showToastMessage } = useUIStore();
  const { run, isPending } = useAsyncAction();

  const handleCreateBaul = async (name: string) => {
    if (!auth.isAuthenticated) return;

    const isFirstBaul = baules.length === 0;
    const result = await run(() => storeCreateBaul(name, ''), {
      errorMessage: 'Error al crear el baúl',
    });
    if (!result.ok) return;

    setSubscription(prev => ({
      ...prev,
      baulesUsed: prev.baulesUsed + 1
    }));

    navigate(`/baules/${result.value.id}/fotos-sueltas/confirmar`);

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
      initialName={suggestBaulName(userProfile.name)}
      isSubmitting={isPending()}
    />
  );
};
