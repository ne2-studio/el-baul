import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { readString, writeString } from '@/utils/safeLocalStorage';

// Android-only for now — see docs/architecture/native-android.md. Gated on both
// isNativePlatform() and the platform name (not just isPluginAvailable) so a stale iOS build
// that happens to have this plugin registered doesn't attempt it too.
export function isPushNotificationsSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export class PushPermissionDeniedError extends Error {
  constructor() {
    super('Push notification permission was denied');
    this.name = 'PushPermissionDeniedError';
  }
}

const TOKEN_STORAGE_KEY = 'elbaul.pushToken';

export function getStoredPushToken(): string | null {
  return readString(TOKEN_STORAGE_KEY);
}

function setStoredPushToken(token: string | null): void {
  writeString(TOKEN_STORAGE_KEY, token);
}

// Requests the native permission, registers the device with FCM, and resolves with the
// resulting token (also persisted locally so the settings toggle can reflect this device's
// state without a server round trip). Rejects with PushPermissionDeniedError if the user
// declines the permission prompt, or with the plugin's own error otherwise.
export async function requestAndRegisterPushToken(): Promise<string> {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') {
    throw new PushPermissionDeniedError();
  }

  const token = await new Promise<string>((resolve, reject) => {
    const settle = (fn: () => void) => {
      fn();
      registrationHandle.then((h) => h.remove());
      errorHandle.then((h) => h.remove());
    };

    const registrationHandle = PushNotifications.addListener('registration', (result) =>
      settle(() => resolve(result.value))
    );
    const errorHandle = PushNotifications.addListener('registrationError', (error) =>
      settle(() => reject(new Error(error.error)))
    );

    PushNotifications.register();
  });

  setStoredPushToken(token);
  return token;
}

export async function unregisterPushToken(): Promise<void> {
  await PushNotifications.unregister();
  setStoredPushToken(null);
}
