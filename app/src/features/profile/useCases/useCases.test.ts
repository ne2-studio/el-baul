import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfile } from '@/types';

vi.mock('@/api', () => ({
  api: {
    users: {
      getProfile: vi.fn(),
      updateNotificationPreferences: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { useAuthStore } from '@/store/useAuthStore';
import { loadNotificationPreferences, updateNotificationPreferences } from './index';

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
