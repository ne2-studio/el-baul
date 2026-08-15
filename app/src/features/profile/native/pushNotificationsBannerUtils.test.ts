// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dismissPushNotificationsBanner,
  isPushNotificationsBannerDismissed,
} from './pushNotificationsBannerUtils';

describe('push notifications banner dismissal cooldown', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is not dismissed when never dismissed before', () => {
    expect(isPushNotificationsBannerDismissed()).toBe(false);
  });

  it('is dismissed right after dismissing', () => {
    const now = Date.now();
    dismissPushNotificationsBanner(now);
    expect(isPushNotificationsBannerDismissed(now)).toBe(true);
  });

  it('stays dismissed just under a week later', () => {
    const now = Date.now();
    dismissPushNotificationsBanner(now);
    expect(isPushNotificationsBannerDismissed(now + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000)).toBe(true);
  });

  it('shows again a week after being dismissed', () => {
    const now = Date.now();
    dismissPushNotificationsBanner(now);
    expect(isPushNotificationsBannerDismissed(now + 7 * 24 * 60 * 60 * 1000)).toBe(false);
  });

  it('fails open when localStorage is unavailable (private mode/quota)', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(isPushNotificationsBannerDismissed()).toBe(false);

    getItemSpy.mockRestore();
  });
});
