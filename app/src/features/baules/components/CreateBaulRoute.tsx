import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreateBaulForm } from '@/app/components/CreateBaulForm';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export const CreateBaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, setSubscription } = useAuthStore();
  const { baules, createBaul: storeCreateBaul } = useDataStore();
  const { showToastMessage } = useUIStore();
  
  const isOnboarding = new URLSearchParams(location.search).get('onboarding') === 'true';

  const handleCreateBaul = async (name: string, description: string) => {
    if (!accessToken) return;
    
    try {
      const isFirstBaul = baules.length === 0;
      await storeCreateBaul(accessToken, name, description);
      
      // Update subscription usage
      setSubscription(prev => ({
        ...prev,
        baulesUsed: prev.baulesUsed + 1
      }));
      
      navigate('/baules');
      
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
