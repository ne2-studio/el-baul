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
import { useAuthStore } from './useAuthStore';

function makeProfile(weeklyDigestEnabled: boolean): UserProfile {
  return new UserProfile({ id: 'u1', email: 'a@b.com', name: 'A', createdAt: new Date().toISOString(), weeklyDigestEnabled });
}

describe('useAuthStore notification preferences', () => {
  beforeEach(() => {
    useAuthStore.setState({ weeklyDigestEnabled: null });
    vi.clearAllMocks();
  });

  it('loadNotificationPreferences fetches the profile and stores the flag', async () => {
    vi.mocked(api.users.getProfile).mockResolvedValue(makeProfile(true));

    await useAuthStore.getState().loadNotificationPreferences();

    expect(useAuthStore.getState().weeklyDigestEnabled).toBe(true);
  });

  it('loadNotificationPreferences is a no-op once already populated, e.g. by session bootstrap', async () => {
    useAuthStore.setState({ weeklyDigestEnabled: false });

    await useAuthStore.getState().loadNotificationPreferences();

    expect(api.users.getProfile).not.toHaveBeenCalled();
    expect(useAuthStore.getState().weeklyDigestEnabled).toBe(false);
  });

  it('updateNotificationPreferences calls the API and stores the response value', async () => {
    useAuthStore.setState({ weeklyDigestEnabled: false });
    vi.mocked(api.users.updateNotificationPreferences).mockResolvedValue(makeProfile(true));

    await useAuthStore.getState().updateNotificationPreferences(true);

    expect(api.users.updateNotificationPreferences).toHaveBeenCalledWith(true);
    expect(useAuthStore.getState().weeklyDigestEnabled).toBe(true);
  });

  it('reset clears weeklyDigestEnabled back to null', () => {
    useAuthStore.setState({ weeklyDigestEnabled: true });

    useAuthStore.getState().reset();

    expect(useAuthStore.getState().weeklyDigestEnabled).toBeNull();
  });
});
