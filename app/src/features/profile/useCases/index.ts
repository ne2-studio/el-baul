import { api } from '@/api';
import { useAuthStore } from '@/store/useAuthStore';

export async function loadNotificationPreferences(): Promise<void> {
  if (useAuthStore.getState().weeklyDigestEnabled !== null) return;
  const profile = await api.users.getProfile();
  useAuthStore.setState({ weeklyDigestEnabled: profile.weeklyDigestEnabled });
}

export async function updateNotificationPreferences(weeklyDigestEnabled: boolean): Promise<void> {
  const profile = await api.users.updateNotificationPreferences(weeklyDigestEnabled);
  useAuthStore.setState({ weeklyDigestEnabled: profile.weeklyDigestEnabled });
}
