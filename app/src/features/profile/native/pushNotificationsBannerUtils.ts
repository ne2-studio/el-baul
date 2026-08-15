const DISMISSED_AT_STORAGE_KEY = 'elbaul.pushNotificationsBannerDismissedAt';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 1 semana

// Deliberadamente en localStorage y no en el backend ni en un plugin nativo persistente: al
// desinstalar/reinstalar la app, o instalar en otro dispositivo, el WebView arranca con storage
// vacío y el aviso puede volver a mostrarse — comportamiento pedido en el issue #23, no un
// descuido. Mismo idioma try/catch que androidAppBannerUtils.ts: modo privado o cuota de
// localStorage llena no debe romper el aviso, en el peor caso reaparece más de lo debido.
export function isPushNotificationsBannerDismissed(now: number = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_AT_STORAGE_KEY);
    if (!raw) return false;
    return now - Number(raw) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function dismissPushNotificationsBanner(now: number = Date.now()): void {
  try {
    localStorage.setItem(DISMISSED_AT_STORAGE_KEY, String(now));
  } catch {
    // ver comentario de isPushNotificationsBannerDismissed
  }
}
