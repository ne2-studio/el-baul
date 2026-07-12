import { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { UserProfile, Subscription } from '../types';
import { getUserProfile, signOut } from '../services/auth.service';

interface AuthState {
  accessToken: string | null;
  userProfile: {
    photoUrl: string;
    name: string;
    email: string;
  };
  subscription: Subscription;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAccessToken: (token: string | null) => void;
  setUserProfile: (profile: { photoUrl: string; name: string; email: string }) => void;
  setSubscription: (subscription: Subscription | ((prev: Subscription) => Subscription)) => void;
  loadUserProfile: (token: string, supabaseUser?: User | null) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  userProfile: {
    photoUrl: '',
    name: '',
    email: ''
  },
  subscription: {
    currentPlan: 'gratuito',
    baulesUsed: 0,
    baulesLimit: 2,
    storagePerBaulGB: 10
  },
  isLoading: false,
  error: null,

  setAccessToken: (token) => set({ accessToken: token }),
  
  setUserProfile: (profile) => set({ userProfile: profile }),
  
  setSubscription: (subscriptionOrFn) => set((state) => ({
    subscription: typeof subscriptionOrFn === 'function' 
      ? subscriptionOrFn(state.subscription) 
      : subscriptionOrFn
  })),

  loadUserProfile: async (token: string, supabaseUser?: User | null) => {
    set({ isLoading: true, error: null });
    try {
      const { profile } = await getUserProfile(token);
      
      // Obtener datos de Google de los metadatos de Supabase si existen
      const googleName = supabaseUser?.user_metadata?.full_name || supabaseUser?.user_metadata?.name;
      const googlePhoto = supabaseUser?.user_metadata?.avatar_url || supabaseUser?.user_metadata?.picture;

      if (profile) {
        set({
          userProfile: {
            photoUrl: profile.photoUrl || googlePhoto || '',
            name: profile.name || googleName || profile.email,
            email: profile.email
          },
          isLoading: false
        });
      } else if (supabaseUser) {
        // Fallback a los datos de Supabase si la API de perfil no responde con datos
        set({
          userProfile: {
            photoUrl: googlePhoto || '',
            name: googleName || supabaseUser.email || '',
            email: supabaseUser.email || ''
          },
          isLoading: false
        });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      await signOut();
      set({
        accessToken: null,
        userProfile: { photoUrl: '', name: '', email: '' },
        subscription: {
          currentPlan: 'gratuito',
          baulesUsed: 0,
          baulesLimit: 2,
          storagePerBaulGB: 10
        }
      });
    } catch (error) {
      console.error('Error in authStore signOut:', error);
      throw error;
    }
  }
}));
