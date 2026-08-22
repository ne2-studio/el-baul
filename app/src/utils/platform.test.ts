// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false), getPlatform: vi.fn(() => 'web') },
}));

import { Capacitor } from '@capacitor/core';
import { getClientPlatform } from './platform';

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36';
const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

function setUserAgent(ua: string) {
  vi.stubGlobal('navigator', { ...navigator, userAgent: ua });
}

function setStandalone(isStandalone: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: isStandalone }));
}

describe('getClientPlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    setStandalone(false);
  });

  it('is android_native inside the native Android app', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    expect(getClientPlatform()).toBe('android_native');
  });

  it('is ios_native inside the native iOS app', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    expect(getClientPlatform()).toBe('ios_native');
  });

  it('is android_browser on Android Chrome, not installed as PWA', () => {
    setUserAgent(ANDROID_UA);
    expect(getClientPlatform()).toBe('android_browser');
  });

  it('is android_pwa on Android, launched from an installed PWA', () => {
    setUserAgent(ANDROID_UA);
    setStandalone(true);
    expect(getClientPlatform()).toBe('android_pwa');
  });

  it('is ios_browser on iOS Safari, not installed as PWA', () => {
    setUserAgent(IOS_UA);
    expect(getClientPlatform()).toBe('ios_browser');
  });

  it('is ios_pwa on iOS, launched from the home screen', () => {
    setUserAgent(IOS_UA);
    setStandalone(true);
    expect(getClientPlatform()).toBe('ios_pwa');
  });

  it('is desktop_browser on a desktop browser, not installed as PWA', () => {
    setUserAgent(DESKTOP_UA);
    expect(getClientPlatform()).toBe('desktop_browser');
  });

  it('is desktop_pwa on desktop, launched from an installed PWA', () => {
    setUserAgent(DESKTOP_UA);
    setStandalone(true);
    expect(getClientPlatform()).toBe('desktop_pwa');
  });
});
