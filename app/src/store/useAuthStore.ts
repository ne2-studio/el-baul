import { create } from 'zustand';
import { getStoredPushToken } from '@/features/profile/native/pushNotifications';

export interface AuthState {
  // Auth-derived state. The raw access token itself lives only in api.ts.
  isAuthenticated: boolean;
  userProfile: { photoUrl: string; name: string; email: string };
  // null until the profile has loaded — see features/profile/useCases.loadNotificationPreferences.
  weeklyDigestEnabled: boolean | null;
  // Local-device state, not server data — true iff this device has a push token stored (see
  // features/profile/native/pushNotifications.ts). Read synchronously at store creation, same
  // as useCurrentBaulStore's currentBaulId, so it never needs a "not loaded yet" null state.
  pushNotificationsEnabled: boolean;
  // null until the profile has loaded (see loadUserData) — treated as "not seen" by App.tsx's
  // post-login redirect, so a profile-load failure shows the onboarding carousel again rather
  // than risk skipping it for a user who's never actually seen it.
  hasSeenOnboarding: boolean | null;

  setAuthenticated: (value: boolean) => void;
  setUserProfile: (profile: { photoUrl: string; name: string; email: string }) => void;
  setWeeklyDigestEnabled: (value: boolean) => void;
  setPushNotificationsEnabled: (value: boolean) => void;
  setHasSeenOnboarding: (value: boolean) => void;
  reset: () => void;
}

// Notification-preference actions live in features/profile/useCases.
export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userProfile: { photoUrl: '', name: '', email: '' },
  weeklyDigestEnabled: null,
  pushNotificationsEnabled: getStoredPushToken() !== null,
  hasSeenOnboarding: null,

  setAuthenticated: (value) => set({ isAuthenticated: value }),

  setUserProfile: (profile) => set({ userProfile: profile }),

  setWeeklyDigestEnabled: (value) => set({ weeklyDigestEnabled: value }),

  setPushNotificationsEnabled: (value) => set({ pushNotificationsEnabled: value }),

  setHasSeenOnboarding: (value) => set({ hasSeenOnboarding: value }),

  reset: () => set({
    isAuthenticated: false,
    userProfile: { photoUrl: '', name: '', email: '' },
    weeklyDigestEnabled: null,
    hasSeenOnboarding: null,
  }),
}));
