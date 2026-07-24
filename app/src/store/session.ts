import { api } from '@/api';
import { UserProfile } from '@/types';
import { useAuthStore } from './useAuthStore';
import { useBaulesStore } from './useBaulesStore';
import { usePersonasStore } from './usePersonasStore';
import { useRecuerdosStore } from './useRecuerdosStore';

async function loadProfile(): Promise<UserProfile | null> {
  try {
    return await api.users.getProfile();
  } catch (error) {
    console.log('Failed to load user profile:', error);
    return null;
  }
}

// Loads the baúles list and the user's profile together on login/refresh. These live in
// separate stores (baules is domain data, profile is auth-derived), but the two requests
// are still fired together and isLoading only reflects the baúles fetch — profile failures
// are swallowed by loadProfile itself and never fail this call.
export async function loadUserData(): Promise<void> {
  useBaulesStore.setState({ isLoading: true });
  try {
    const [baules, profile] = await Promise.all([
      api.baules.getAll(),
      loadProfile(),
    ]);

    useBaulesStore.setState({ baules, isLoading: false });
    if (profile) {
      useAuthStore.getState().setUserProfile({ photoUrl: '', name: profile.name || profile.email, email: profile.email });
    }
  } catch (error) {
    useBaulesStore.setState({ isLoading: false });
    throw error;
  }
}

// Clears every domain store on sign-out / loss of auth. Each store only knows how to
// reset its own slice; this is the explicit call site that fans that out across all of them.
export function resetAllStores(): void {
  useAuthStore.getState().reset();
  useBaulesStore.getState().reset();
  usePersonasStore.getState().reset();
  useRecuerdosStore.getState().reset();
}
