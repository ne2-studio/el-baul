import { create } from 'zustand';
import { api } from '@/api';

interface AppConfigState {
  // Defaults to false so paywall hints never flash before the config loads.
  monetizationEnabled: boolean;
  helpCenterUrl: string;
  fetchAppConfig: () => Promise<void>;
}

export const useAppConfigStore = create<AppConfigState>((set) => ({
  monetizationEnabled: false,
  helpCenterUrl: '',

  fetchAppConfig: async () => {
    try {
      const config = await api.appConfig.get();
      set({ monetizationEnabled: config.features.monetization, helpCenterUrl: config.helpCenterUrl });
    } catch (error) {
      console.error('Error loading app config:', error);
    }
  },
}));
