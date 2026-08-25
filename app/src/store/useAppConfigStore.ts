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
  // Defaults to false so the "Gestionar memoria" chat menu entry never flashes visible before
  // the backend confirms the rollout is on.
  chatMemoryEnabled: boolean;
  // Defaults to false so the "Ver en TV" menu entry never flashes visible before the backend
  // confirms Modo TV's rollout is on — see docs PRD "Modo TV".
  tvModeEnabled: boolean;
  // Defaults to false; while true, App renders MaintenanceScreen instead of the app. Every
  // other backend request 503s while this is on, so it's fetched from the one endpoint the
  // backend still serves during maintenance (see MaintenanceModeMiddleware).
  maintenanceModeEnabled: boolean;
  // Defaults to false so the Biografía tab (and any biografía content) never flashes visible
  // before the backend confirms the rollout is on — the backend also enforces this server-side
  // (write endpoint, AI context), so hiding the tab is not the only protection.
  biografiaEnabled: boolean;
  helpCenterUrl: string;
  // Falls back to the current origin until the backend-configured value loads, so
  // sharing still produces a usable (if not canonical) link rather than a broken one.
  appUrl: string;
  // Empty until configured — AndroidAppBanner treats that as "not ready" and stays hidden
  // rather than linking to a blank Play Store URL.
  googlePlayUrl: string;
  // Cuánto tiempo, en minutos, se suprime la recomendación de contribución en un baúl tras
  // resolverse (ver uiStore.isContributionSuggestionOnCooldown). Configurable vía appsettings
  // para poder acortarlo en pruebas sin tocar código. Por defecto 60 — mismo valor con el que
  // nació la funcionalidad, antes de ser configurable.
  contributionSuggestionCooldownMinutes: number;
  fetchAppConfig: () => Promise<void>;
}

const DEFAULT_CONTRIBUTION_SUGGESTION_COOLDOWN_MINUTES = 60;

export const useAppConfigStore = create<AppConfigState>((set) => ({
  chatEnabled: false,
  chatSuggestionsEnabled: false,
  sharedLinksEnabled: false,
  baulFeedEnabled: false,
  androidAppBannerEnabled: false,
  chatMemoryEnabled: false,
  tvModeEnabled: false,
  maintenanceModeEnabled: false,
  biografiaEnabled: false,
  helpCenterUrl: '',
  appUrl: window.location.origin,
  googlePlayUrl: '',
  contributionSuggestionCooldownMinutes: DEFAULT_CONTRIBUTION_SUGGESTION_COOLDOWN_MINUTES,

  fetchAppConfig: async () => {
    try {
      const config = await api.appConfig.get();
      set({
        chatEnabled: config.features.chatEnabled,
        chatSuggestionsEnabled: config.features.chatSuggestionsEnabled,
        sharedLinksEnabled: config.features.sharedLinksEnabled ?? false,
        baulFeedEnabled: config.features.baulFeedEnabled ?? false,
        androidAppBannerEnabled: config.features.androidAppBannerEnabled ?? false,
        chatMemoryEnabled: config.features.chatMemoryEnabled ?? false,
        tvModeEnabled: config.features.tvModeEnabled ?? false,
        maintenanceModeEnabled: config.features.maintenanceModeEnabled ?? false,
        biografiaEnabled: config.features.biografiaEnabled ?? false,
        helpCenterUrl: config.helpCenterUrl ?? '',
        appUrl: config.appUrl ?? window.location.origin,
        googlePlayUrl: config.googlePlayUrl ?? '',
        contributionSuggestionCooldownMinutes:
          config.contributionSuggestionCooldownMinutes ?? DEFAULT_CONTRIBUTION_SUGGESTION_COOLDOWN_MINUTES,
      });
    } catch (error) {
      console.error('Error loading app config:', error);
    }
  },
}));
