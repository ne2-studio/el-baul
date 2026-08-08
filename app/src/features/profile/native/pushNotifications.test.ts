// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true), getPlatform: vi.fn(() => 'android') },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    addListener: vi.fn(),
  },
}));

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import {
  getStoredPushToken,
  requestAndRegisterPushToken,
  unregisterPushToken,
  isPushNotificationsSupported,
  PushPermissionDeniedError,
} from './pushNotifications';

describe('pushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
  });

  describe('isPushNotificationsSupported', () => {
    it('is true only for native Android', () => {
      expect(isPushNotificationsSupported()).toBe(true);
    });

    it('is false off native platforms', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      expect(isPushNotificationsSupported()).toBe(false);
    });

    it('is false on a native platform that is not Android (e.g. iOS)', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
      expect(isPushNotificationsSupported()).toBe(false);
    });
  });

  describe('requestAndRegisterPushToken', () => {
    it('resolves with the token and persists it once registration succeeds', async () => {
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      vi.mocked(PushNotifications.addListener).mockImplementation(((event: string, callback: (arg: unknown) => void) => {
        if (event === 'registration') {
          queueMicrotask(() => callback({ value: 'fcm-token' }));
        }
        return Promise.resolve({ remove: vi.fn() });
      }) as typeof PushNotifications.addListener);

      const token = await requestAndRegisterPushToken();

      expect(token).toBe('fcm-token');
      expect(getStoredPushToken()).toBe('fcm-token');
      expect(PushNotifications.register).toHaveBeenCalled();
    });

    it('rejects with PushPermissionDeniedError when the permission prompt is declined', async () => {
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'denied' });

      await expect(requestAndRegisterPushToken()).rejects.toBeInstanceOf(PushPermissionDeniedError);
      expect(PushNotifications.register).not.toHaveBeenCalled();
      expect(getStoredPushToken()).toBeNull();
    });

    it('rejects when the plugin reports a registrationError', async () => {
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      vi.mocked(PushNotifications.addListener).mockImplementation(((event: string, callback: (arg: unknown) => void) => {
        if (event === 'registrationError') {
          queueMicrotask(() => callback({ error: 'boom' }));
        }
        return Promise.resolve({ remove: vi.fn() });
      }) as typeof PushNotifications.addListener);

      await expect(requestAndRegisterPushToken()).rejects.toThrow('boom');
      expect(getStoredPushToken()).toBeNull();
    });
  });

  describe('unregisterPushToken', () => {
    it('calls the native unregister and clears the stored token', async () => {
      localStorage.setItem('elbaul.pushToken', 'fcm-token');

      await unregisterPushToken();

      expect(PushNotifications.unregister).toHaveBeenCalled();
      expect(getStoredPushToken()).toBeNull();
    });
  });
});
