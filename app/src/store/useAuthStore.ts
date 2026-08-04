import { create } from 'zustand';
import { api } from '@/api';
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
  // null until the profile has loaded — see loadNotificationPreferences.
  weeklyDigestEnabled: boolean | null;
  subscription: Subscription;

  setAuthenticated: (value: boolean) => void;
  setUserProfile: (profile: { photoUrl: string; name: string; email: string }) => void;
  setWeeklyDigestEnabled: (value: boolean) => void;
  // Fallback for routes that render before the session-level profile load (session.ts)
  // has resolved, e.g. a hard refresh landing directly on the notification prefs screen.
  loadNotificationPreferences: () => Promise<void>;
  updateNotificationPreferences: (weeklyDigestEnabled: boolean) => Promise<void>;
  setSubscription: (subscription: Subscription | ((prev: Subscription) => Subscription)) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  userProfile: { photoUrl: '', name: '', email: '' },
  weeklyDigestEnabled: null,
  subscription: defaultSubscription,

  setAuthenticated: (value) => set({ isAuthenticated: value }),

  setUserProfile: (profile) => set({ userProfile: profile }),

  setWeeklyDigestEnabled: (value) => set({ weeklyDigestEnabled: value }),

  loadNotificationPreferences: async () => {
    if (get().weeklyDigestEnabled !== null) return;
    const profile = await api.users.getProfile();
    set({ weeklyDigestEnabled: profile.weeklyDigestEnabled });
  },

  updateNotificationPreferences: async (weeklyDigestEnabled) => {
    const profile = await api.users.updateNotificationPreferences(weeklyDigestEnabled);
    set({ weeklyDigestEnabled: profile.weeklyDigestEnabled });
  },

  setSubscription: (subscriptionOrFn) => set((state) => ({
    subscription: typeof subscriptionOrFn === 'function' ? subscriptionOrFn(state.subscription) : subscriptionOrFn,
  })),

  reset: () => set({
    isAuthenticated: false,
    userProfile: { photoUrl: '', name: '', email: '' },
    weeklyDigestEnabled: null,
    subscription: defaultSubscription,
  }),
}));
