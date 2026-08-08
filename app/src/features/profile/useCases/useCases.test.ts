import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfile } from '@/types';

vi.mock('@/api', () => ({
  api: {
    users: {
      getProfile: vi.fn(),
      updateNotificationPreferences: vi.fn(),
    },
    pushNotifications: {
      register: vi.fn(),
      unregister: vi.fn(),
    },
  },
}));

vi.mock('@/features/profile/native/pushNotifications', () => ({
  getStoredPushToken: vi.fn(),
  requestAndRegisterPushToken: vi.fn(),
  unregisterPushToken: vi.fn(),
}));

import { api } from '@/api';
import { useAuthStore } from '@/store/useAuthStore';
import * as nativePushNotifications from '@/features/profile/native/pushNotifications';
import {
  loadNotificationPreferences,
  updateNotificationPreferences,
  enablePushNotifications,
  disablePushNotifications,
} from './index';

function makeProfile(weeklyDigestEnabled: boolean): UserProfile {
  return new UserProfile({ id: 'u1', email: 'a@b.com', name: 'A', createdAt: new Date().toISOString(), weeklyDigestEnabled, hasSeenOnboarding: true });
}

describe('profile useCases notification preferences', () => {
  beforeEach(() => {
    useAuthStore.setState({ weeklyDigestEnabled: null });
    vi.clearAllMocks();
  });

  it('loadNotificationPreferences fetches the profile and stores the flag', async () => {
    vi.mocked(api.users.getProfile).mockResolvedValue(makeProfile(true));

    await loadNotificationPreferences();

    expect(useAuthStore.getState().weeklyDigestEnabled).toBe(true);
  });

  it('loadNotificationPreferences is a no-op once already populated, e.g. by session bootstrap', async () => {
    useAuthStore.setState({ weeklyDigestEnabled: false });

    await loadNotificationPreferences();

    expect(api.users.getProfile).not.toHaveBeenCalled();
    expect(useAuthStore.getState().weeklyDigestEnabled).toBe(false);
  });

  it('updateNotificationPreferences calls the API and stores the response value', async () => {
    useAuthStore.setState({ weeklyDigestEnabled: false });
    vi.mocked(api.users.updateNotificationPreferences).mockResolvedValue(makeProfile(true));

    await updateNotificationPreferences(true);

    expect(api.users.updateNotificationPreferences).toHaveBeenCalledWith(true);
    expect(useAuthStore.getState().weeklyDigestEnabled).toBe(true);
  });
});

describe('profile useCases push notifications', () => {
  beforeEach(() => {
    useAuthStore.setState({ pushNotificationsEnabled: false });
    vi.clearAllMocks();
  });

  it('enablePushNotifications registers the native token with the backend and flips the store', async () => {
    vi.mocked(nativePushNotifications.requestAndRegisterPushToken).mockResolvedValue('fcm-token');
    vi.mocked(api.pushNotifications.register).mockResolvedValue(undefined);

    await enablePushNotifications();

    expect(api.pushNotifications.register).toHaveBeenCalledWith('fcm-token', 'android');
    expect(useAuthStore.getState().pushNotificationsEnabled).toBe(true);
  });

  it('enablePushNotifications leaves the store untouched when the native request rejects', async () => {
    vi.mocked(nativePushNotifications.requestAndRegisterPushToken).mockRejectedValue(new Error('denied'));

    await expect(enablePushNotifications()).rejects.toThrow('denied');

    expect(api.pushNotifications.register).not.toHaveBeenCalled();
    expect(useAuthStore.getState().pushNotificationsEnabled).toBe(false);
  });

  it('disablePushNotifications unregisters the stored token from the backend and locally, then flips the store', async () => {
    useAuthStore.setState({ pushNotificationsEnabled: true });
    vi.mocked(nativePushNotifications.getStoredPushToken).mockReturnValue('fcm-token');

    await disablePushNotifications();

    expect(api.pushNotifications.unregister).toHaveBeenCalledWith('fcm-token');
    expect(nativePushNotifications.unregisterPushToken).toHaveBeenCalled();
    expect(useAuthStore.getState().pushNotificationsEnabled).toBe(false);
  });

  it('disablePushNotifications skips the backend call when there is no locally stored token', async () => {
    useAuthStore.setState({ pushNotificationsEnabled: true });
    vi.mocked(nativePushNotifications.getStoredPushToken).mockReturnValue(null);

    await disablePushNotifications();

    expect(api.pushNotifications.unregister).not.toHaveBeenCalled();
    expect(nativePushNotifications.unregisterPushToken).toHaveBeenCalled();
    expect(useAuthStore.getState().pushNotificationsEnabled).toBe(false);
  });
});
