import { Capacitor } from '@capacitor/core';

// Mismo esquema que ya declara el intent-filter de MainActivity para el callback OIDC (ver
// AndroidManifest.xml y nativeOidcCallback.ts) — se reutiliza tal cual para no tocar nada
// nativo. El host tiene que ser exactamente "callback": es el único que el intent-filter
// registra, así que Android solo enruta el intent:// hacia la app para esa combinación
// scheme+host. No dispara ningún intercambio OIDC real: isNativeOidcCallbackUrl exige un
// `code`/`error` en la query para tratarlo como un login, y este enlace no lleva ninguno — solo
// lanza la app.
const ANDROID_APP_SCHEME = 'studio.ne2.elbaul';
const ANDROID_APP_PACKAGE = 'studio.ne2.elbaul';
const ANDROID_APP_CALLBACK_HOST = 'callback';

const DISMISSED_AT_STORAGE_KEY = 'elbaul.androidAppBannerDismissedAt';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1 día

// Solo tiene sentido en la webapp (no dentro de la propia app nativa, que ya está instalada) y
// solo en Android — iOS no entiende intent:// y no hay equivalente configurado para App Store.
export function isAndroidWebBrowser(): boolean {
  return !Capacitor.isNativePlatform() && /Android/i.test(navigator.userAgent);
}

// intent:// es lo que entiende Chrome para Android (con diferencia el navegador dominante ahí)
// para "si la app está instalada, ábrela; si no, cae al fallback" en un único tap, sin JS
// adicional para detectar el fallo típico de los custom schemes a pelo (ventana de tiempo +
// visibilitychange). Si la app ya está instalada, Android la abre directamente sin pasar por
// browser_fallback_url en absoluto.
export function buildAndroidAppIntentUrl(googlePlayUrl: string): string {
  const fallback = encodeURIComponent(googlePlayUrl);
  return (
    `intent://${ANDROID_APP_CALLBACK_HOST}#Intent;` +
    `scheme=${ANDROID_APP_SCHEME};package=${ANDROID_APP_PACKAGE};` +
    `S.browser_fallback_url=${fallback};end`
  );
}

// try/catch en ambos lados, mismo motivo que useCurrentBaulStore/entrySource: modo privado o
// cuota de localStorage llena no debe romper el banner — en el peor caso reaparece más de lo
// debido en vez de desaparecer para siempre.
export function isAndroidAppBannerDismissed(now: number = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_AT_STORAGE_KEY);
    if (!raw) return false;
    return now - Number(raw) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function dismissAndroidAppBanner(now: number = Date.now()): void {
  try {
    localStorage.setItem(DISMISSED_AT_STORAGE_KEY, String(now));
  } catch {
    // ver comentario de isAndroidAppBannerDismissed
  }
}
