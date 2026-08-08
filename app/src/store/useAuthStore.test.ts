import { describe, expect, it } from 'vitest';
import { useAuthStore } from './useAuthStore';

describe('useAuthStore', () => {
  it('reset clears weeklyDigestEnabled back to null', () => {
    useAuthStore.setState({ weeklyDigestEnabled: true });

    useAuthStore.getState().reset();

    expect(useAuthStore.getState().weeklyDigestEnabled).toBeNull();
  });

  // Device-local state, not account state — a device that registered for push stays
  // registered across a sign-out/sign-in on the same device, same as useCurrentBaulStore's
  // currentBaulId.
  it('reset does not clear pushNotificationsEnabled', () => {
    useAuthStore.setState({ pushNotificationsEnabled: true });

    useAuthStore.getState().reset();

    expect(useAuthStore.getState().pushNotificationsEnabled).toBe(true);
  });

  it('setPushNotificationsEnabled updates the flag', () => {
    useAuthStore.getState().setPushNotificationsEnabled(true);
    expect(useAuthStore.getState().pushNotificationsEnabled).toBe(true);

    useAuthStore.getState().setPushNotificationsEnabled(false);
    expect(useAuthStore.getState().pushNotificationsEnabled).toBe(false);
  });
});
