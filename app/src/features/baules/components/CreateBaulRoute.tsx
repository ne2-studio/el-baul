import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreateBaulForm } from '@/app/components/CreateBaulForm';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';

export const CreateBaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const { setSubscription, baules, createBaul: storeCreateBaul } = useAppStore();
  const { showToastMessage } = useUIStore();

  const isOnboarding = new URLSearchParams(location.search).get('onboarding') === 'true';

  const handleCreateBaul = async (name: string, description: string) => {
    if (!auth.isAuthenticated) return;

    try {
      const isFirstBaul = baules.length === 0;
      const baul = await storeCreateBaul(name, description);

      // Update subscription usage
      setSubscription(prev => ({
        ...prev,
        baulesUsed: prev.baulesUsed + 1
      }));

      navigate(`/baules/${baul.id}`);
      
      if (isFirstBaul) {
        setTimeout(() => {
          showToastMessage('Tus recuerdos ya están a salvo');
        }, 300);
      }
    } catch (error) {
      console.error('Error creating baul:', error);
      showToastMessage('Error al crear el baúl');
    }
  };

  return (
    <CreateBaulForm
      onBack={() => navigate('/baules')}
      onSubmit={handleCreateBaul}
      isOnboarding={isOnboarding}
    />
  );
};
