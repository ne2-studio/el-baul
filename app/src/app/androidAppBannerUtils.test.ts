// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

import { Capacitor } from '@capacitor/core';
import {
  buildAndroidAppIntentUrl,
  dismissAndroidAppBanner,
  isAndroidAppBannerDismissed,
  isAndroidWebBrowser,
} from './androidAppBannerUtils';

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36';
const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function setUserAgent(ua: string) {
  vi.stubGlobal('navigator', { ...navigator, userAgent: ua });
}

describe('isAndroidWebBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  it('is true on an Android browser', () => {
    setUserAgent(ANDROID_UA);
    expect(isAndroidWebBrowser()).toBe(true);
  });

  it('is false on iOS', () => {
    setUserAgent(IOS_UA);
    expect(isAndroidWebBrowser()).toBe(false);
  });

  it('is false inside the native Android app (already installed)', () => {
    setUserAgent(ANDROID_UA);
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    expect(isAndroidWebBrowser()).toBe(false);
  });
});

describe('buildAndroidAppIntentUrl', () => {
  it('targets the existing OIDC callback scheme/host and encodes the Play Store fallback', () => {
    const url = buildAndroidAppIntentUrl('https://play.google.com/store/apps/details?id=studio.ne2.elbaul');

    expect(url).toBe(
      'intent://callback#Intent;scheme=studio.ne2.elbaul;package=studio.ne2.elbaul;' +
        'S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dstudio.ne2.elbaul;end'
    );
  });
});

describe('android app banner dismissal cooldown', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is not dismissed when never dismissed before', () => {
    expect(isAndroidAppBannerDismissed()).toBe(false);
  });

  it('is dismissed right after dismissing', () => {
    const now = Date.now();
    dismissAndroidAppBanner(now);
    expect(isAndroidAppBannerDismissed(now)).toBe(true);
  });

  it('stays dismissed just under a day later', () => {
    const now = Date.now();
    dismissAndroidAppBanner(now);
    expect(isAndroidAppBannerDismissed(now + 23 * 60 * 60 * 1000)).toBe(true);
  });

  it('shows again a day after being dismissed', () => {
    const now = Date.now();
    dismissAndroidAppBanner(now);
    expect(isAndroidAppBannerDismissed(now + 24 * 60 * 60 * 1000)).toBe(false);
  });

  it('fails open when localStorage is unavailable (private mode/quota)', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(isAndroidAppBannerDismissed()).toBe(false);

    getItemSpy.mockRestore();
  });
});
