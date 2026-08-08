import { api } from '@/api';
import { useAuthStore } from '@/store/useAuthStore';
import { getStoredPushToken, requestAndRegisterPushToken, unregisterPushToken } from '@/features/profile/native/pushNotifications';

export async function loadNotificationPreferences(): Promise<void> {
  if (useAuthStore.getState().weeklyDigestEnabled !== null) return;
  const profile = await api.users.getProfile();
  useAuthStore.setState({ weeklyDigestEnabled: profile.weeklyDigestEnabled });
}

export async function updateNotificationPreferences(weeklyDigestEnabled: boolean): Promise<void> {
  const profile = await api.users.updateNotificationPreferences(weeklyDigestEnabled);
  useAuthStore.setState({ weeklyDigestEnabled: profile.weeklyDigestEnabled });
}

// Re-throws PushPermissionDeniedError as-is so the route can show a distinct "go to system
// settings" message instead of a generic failure toast.
export async function enablePushNotifications(): Promise<void> {
  const token = await requestAndRegisterPushToken();
  await api.pushNotifications.register(token, 'android');
  useAuthStore.setState({ pushNotificationsEnabled: true });
}

export async function disablePushNotifications(): Promise<void> {
  const token = getStoredPushToken();
  if (token) await api.pushNotifications.unregister(token);
  await unregisterPushToken();
  useAuthStore.setState({ pushNotificationsEnabled: false });
}
