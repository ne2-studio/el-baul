import { create } from 'zustand';
import { Subscription } from '@/types';

const defaultSubscription: Subscription = {
  currentPlan: 'gratuito',
  baulesUsed: 0,
  baulesLimit: 2,
  storagePerBaulGB: 10,
};

export interface AuthState {
  // Auth-derived state. The raw access token itself lives only in api.ts.
  isAuthenticated: boolean;
  userProfile: { photoUrl: string; name: string; email: string };
  // null until the profile has loaded — see features/profile/useCases.loadNotificationPreferences.
  weeklyDigestEnabled: boolean | null;
  // null until the profile has loaded (see loadUserData) — treated as "not seen" by App.tsx's
  // post-login redirect, so a profile-load failure shows the onboarding carousel again rather
  // than risk skipping it for a user who's never actually seen it.
  hasSeenOnboarding: boolean | null;
  subscription: Subscription;

  setAuthenticated: (value: boolean) => void;
  setUserProfile: (profile: { photoUrl: string; name: string; email: string }) => void;
  setWeeklyDigestEnabled: (value: boolean) => void;
  setHasSeenOnboarding: (value: boolean) => void;
  setSubscription: (subscription: Subscription | ((prev: Subscription) => Subscription)) => void;
  reset: () => void;
}

// Notification-preference actions live in features/profile/useCases.
export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userProfile: { photoUrl: '', name: '', email: '' },
  weeklyDigestEnabled: null,
  hasSeenOnboarding: null,
  subscription: defaultSubscription,

  setAuthenticated: (value) => set({ isAuthenticated: value }),

  setUserProfile: (profile) => set({ userProfile: profile }),

  setWeeklyDigestEnabled: (value) => set({ weeklyDigestEnabled: value }),

  setHasSeenOnboarding: (value) => set({ hasSeenOnboarding: value }),

  setSubscription: (subscriptionOrFn) => set((state) => ({
    subscription: typeof subscriptionOrFn === 'function' ? subscriptionOrFn(state.subscription) : subscriptionOrFn,
  })),

  reset: () => set({
    isAuthenticated: false,
    userProfile: { photoUrl: '', name: '', email: '' },
    weeklyDigestEnabled: null,
    hasSeenOnboarding: null,
    subscription: defaultSubscription,
  }),
}));
