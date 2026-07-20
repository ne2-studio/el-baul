import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { HelpSupportScreen } from '@/app/components/HelpSupportScreen';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useUIStore } from '@/store/uiStore';

export const HelpSupportRoute: React.FC = () => {
  const navigate = useNavigate();
  const { helpCenterUrl } = useAppConfigStore();
  const { setShowProfileMenu } = useUIStore();

  return (
    <HelpSupportScreen
      onBack={() => {
        setShowProfileMenu(false);
        navigate('/baules');
      }}
      onOpenHelpCenter={() => {
        if (helpCenterUrl) Browser.open({ url: helpCenterUrl });
      }}
      onReportBug={() => navigate('/ayuda/problema')}
      onSendSuggestion={() => navigate('/ayuda/sugerencia')}
      onContactSupport={() => navigate('/ayuda/soporte')}
    />
  );
};
