import { api } from '@/api';
import { UserProfile } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useCurrentBaulStore } from '@/store/useCurrentBaulStore';

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
      useAuthStore.getState().setWeeklyDigestEnabled(profile.weeklyDigestEnabled);
      useAuthStore.getState().setHasSeenOnboarding(profile.hasSeenOnboarding);
    }
  } catch (error) {
    useBaulesStore.setState({ isLoading: false });
    throw error;
  }
}

// Fire-and-forget bookkeeping: OnboardingRoute calls this when a first-time (non-invite)
// signup finishes or skips the carousel, so it never shows again for that user. Not awaited
// by the caller — blocking navigation on this pure bookkeeping call would add latency for no
// user-visible benefit, and a failed request just means they see the carousel once more.
export async function markOnboardingSeen(): Promise<void> {
  try {
    const profile = await api.users.markOnboardingSeen();
    useAuthStore.getState().setHasSeenOnboarding(profile.hasSeenOnboarding);
  } catch (error) {
    console.log('Failed to mark onboarding as seen:', error);
  }
}

// Clears every domain store on sign-out / loss of auth. Each store only knows how to
// reset its own slice; this is the explicit call site that fans that out across all of them.
export function resetAllStores(): void {
  useAuthStore.getState().reset();
  useBaulesStore.getState().reset();
  usePersonasStore.getState().reset();
  useRecuerdosStore.getState().reset();
  useCurrentBaulStore.getState().reset();
}
