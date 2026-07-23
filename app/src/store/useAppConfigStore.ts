import { create } from 'zustand';
import { api } from '@/api';

interface AppConfigState {
  // Defaults to false so paywall hints never flash before the config loads.
  monetizationEnabled: boolean;
  // Same reasoning as monetizationEnabled — false until the config loads, so the "Ayúdame a
  // recordar" FAB never flashes visible while the feature is still globally off.
  chatEnabled: boolean;
  helpCenterUrl: string;
  // Falls back to the current origin until the backend-configured value loads, so
  // sharing still produces a usable (if not canonical) link rather than a broken one.
  appUrl: string;
  fetchAppConfig: () => Promise<void>;
}

export const useAppConfigStore = create<AppConfigState>((set) => ({
  monetizationEnabled: false,
  chatEnabled: false,
  helpCenterUrl: '',
  appUrl: window.location.origin,

  fetchAppConfig: async () => {
    try {
      const config = await api.appConfig.get();
      set({
        monetizationEnabled: config.features.monetization,
        chatEnabled: config.features.chatEnabled,
        helpCenterUrl: config.helpCenterUrl,
        appUrl: config.appUrl,
      });
    } catch (error) {
      console.error('Error loading app config:', error);
    }
  },
}));
