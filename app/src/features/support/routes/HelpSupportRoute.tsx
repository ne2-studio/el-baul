import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { HelpSupportScreen } from '@/features/support/components/HelpSupportScreen';
import { useAppConfigStore } from '@/store/useAppConfigStore';

export const HelpSupportRoute: React.FC = () => {
  const navigate = useNavigate();
  const { helpCenterUrl } = useAppConfigStore();

  return (
    <HelpSupportScreen
      onBack={() => navigate('/baules')}
      onOpenHelpCenter={() => {
        if (helpCenterUrl) Browser.open({ url: helpCenterUrl });
      }}
      onReportBug={() => navigate('/ayuda/problema')}
      onSendSuggestion={() => navigate('/ayuda/sugerencia')}
      onContactSupport={() => navigate('/ayuda/soporte')}
    />
  );
};
