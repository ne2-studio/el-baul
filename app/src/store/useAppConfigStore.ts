import { create } from 'zustand';
import { api } from '@/api';

interface AppConfigState {
  // Defaults to false so paywall hints never flash before the config loads.
  monetizationEnabled: boolean;
  // Same reasoning as monetizationEnabled — false until the config loads, so the "Ayúdame a
  // recordar" FAB never flashes visible while the feature is still globally off.
  chatEnabled: boolean;
  // Defaults to false so the chat never flashes starter suggestions or calls the suggestions
  // endpoint unless the backend explicitly opts into that experiment.
  chatSuggestionsEnabled: boolean;
  // Defaults to false so public sharing UI only appears after the backend enables the rollout.
  sharedLinksEnabled: boolean;
  helpCenterUrl: string;
  // Falls back to the current origin until the backend-configured value loads, so
  // sharing still produces a usable (if not canonical) link rather than a broken one.
  appUrl: string;
  fetchAppConfig: () => Promise<void>;
}

export const useAppConfigStore = create<AppConfigState>((set) => ({
  monetizationEnabled: false,
  chatEnabled: false,
  chatSuggestionsEnabled: false,
  sharedLinksEnabled: false,
  helpCenterUrl: '',
  appUrl: window.location.origin,

  fetchAppConfig: async () => {
    try {
      const config = await api.appConfig.get();
      set({
        monetizationEnabled: config.features.monetization,
        chatEnabled: config.features.chatEnabled,
        chatSuggestionsEnabled: config.features.chatSuggestionsEnabled,
        sharedLinksEnabled: config.features.sharedLinksEnabled ?? false,
        helpCenterUrl: config.helpCenterUrl ?? '',
        appUrl: config.appUrl ?? window.location.origin,
      });
    } catch (error) {
      console.error('Error loading app config:', error);
    }
  },
}));
