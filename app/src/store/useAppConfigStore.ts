import { create } from 'zustand';
import { api } from '@/api';

interface AppConfigState {
  // Defaults to false until the config loads, so the "Ayúdame a recordar" FAB never flashes
  // visible while the feature is still globally off.
  chatEnabled: boolean;
  // Defaults to false so the chat never flashes starter suggestions or calls the suggestions
  // endpoint unless the backend explicitly opts into that experiment.
  chatSuggestionsEnabled: boolean;
  // Defaults to false so public sharing UI only appears after the backend enables the rollout.
  sharedLinksEnabled: boolean;
  // Defaults to false so the feed keeps using the old recuerdos-only endpoint/card data until
  // the backend explicitly enables it — see docs/architecture "baúl feed" toggle.
  baulFeedEnabled: boolean;
  // Defaults to false so the "download the app" overlay (AndroidAppBanner) never flashes
  // visible before the backend confirms the rollout is on.
  androidAppBannerEnabled: boolean;
  helpCenterUrl: string;
  // Falls back to the current origin until the backend-configured value loads, so
  // sharing still produces a usable (if not canonical) link rather than a broken one.
  appUrl: string;
  // Empty until configured — AndroidAppBanner treats that as "not ready" and stays hidden
  // rather than linking to a blank Play Store URL.
  googlePlayUrl: string;
  fetchAppConfig: () => Promise<void>;
}

export const useAppConfigStore = create<AppConfigState>((set) => ({
  chatEnabled: false,
  chatSuggestionsEnabled: false,
  sharedLinksEnabled: false,
  baulFeedEnabled: false,
  androidAppBannerEnabled: false,
  helpCenterUrl: '',
  appUrl: window.location.origin,
  googlePlayUrl: '',

  fetchAppConfig: async () => {
    try {
      const config = await api.appConfig.get();
      set({
        chatEnabled: config.features.chatEnabled,
        chatSuggestionsEnabled: config.features.chatSuggestionsEnabled,
        sharedLinksEnabled: config.features.sharedLinksEnabled ?? false,
        baulFeedEnabled: config.features.baulFeedEnabled ?? false,
        androidAppBannerEnabled: config.features.androidAppBannerEnabled ?? false,
        helpCenterUrl: config.helpCenterUrl ?? '',
        appUrl: config.appUrl ?? window.location.origin,
        googlePlayUrl: config.googlePlayUrl ?? '',
      });
    } catch (error) {
      console.error('Error loading app config:', error);
    }
  },
}));
