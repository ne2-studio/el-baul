import { Capacitor } from '@capacitor/core';

// The nine platform buckets tracked for DAU (see docs' analytics plan) — every consumer that
// needs "how is this person running the app" should read from here instead of re-deriving its
// own Capacitor/UA check (androidAppBannerUtils.isAndroidWebBrowser only needs the Android-web
// slice and stays as its own thing, since it also builds intent:// URLs).
export type ClientPlatform =
  | 'android_native'
  | 'ios_native'
  | 'android_browser'
  | 'ios_browser'
  | 'desktop_browser'
  | 'android_pwa'
  | 'ios_pwa'
  | 'desktop_pwa';

// display-mode: standalone is what Chrome/Safari set once a PWA has been "installed" (added to
// home screen / installed from the browser's install prompt) and is launched from its own icon
// rather than a browser tab — the standard way to tell PWA-mode apart from a plain browser tab
// with no native install API to ask instead.
function isStandalonePwa(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
}

export function getClientPlatform(): ClientPlatform {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() === 'ios' ? 'ios_native' : 'android_native';
  }

  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = isStandalonePwa();

  if (isAndroid) return isStandalone ? 'android_pwa' : 'android_browser';
  if (isIos) return isStandalone ? 'ios_pwa' : 'ios_browser';
  return isStandalone ? 'desktop_pwa' : 'desktop_browser';
}
