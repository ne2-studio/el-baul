import type { SigninRedirectArgs } from 'oidc-client-ts';

// Persisted per-tab (sessionStorage, not localStorage) so a fresh app launch/tab always gets
// its own single automatic retry, but the flag survives the full-page navigation that
// signinRedirect() itself performs.
const SESSION_FLAG_KEY = 'elbaul.autoReloginAttempted';

function hasAttemptedAutoRelogin(): boolean {
  try {
    return sessionStorage.getItem(SESSION_FLAG_KEY) === '1';
  } catch {
    // Modo privado o sessionStorage inaccesible: no podemos garantizar que un reintento no
    // vaya a repetirse en bucle, así que nos negamos a intentarlo en vez de arriesgarnos.
    return true;
  }
}

function markAutoReloginAttempted(): void {
  try {
    sessionStorage.setItem(SESSION_FLAG_KEY, '1');
  } catch {
    // ver hasAttemptedAutoRelogin
  }
}

// Se llama cuando una sesión SÍ autenticada vuelve a estar OK (userLoaded / auth.isAuthenticated
// pasa a true), para que una caída posterior en la misma pestaña tenga de nuevo su propio
// reintento automático, en vez de quedar consumido para siempre tras el primer uso.
export function clearAutoReloginAttempt(): void {
  try {
    sessionStorage.removeItem(SESSION_FLAG_KEY);
  } catch {
    // ver hasAttemptedAutoRelogin
  }
}

// Reintenta el login automáticamente, una única vez por caída de sesión, cuando una sesión que
// SÍ estaba autenticada se pierde (silent renew fallido o 401 de la API) — a diferencia del tap
// manual de WelcomeRoute, sin `prompt: 'select_account'`, para no interrumpir con un selector de
// cuenta cuando el usuario no ha pedido nada.
//
// Devuelve si realmente se disparó el signinRedirect(); false le indica al caller que debe caer
// de vuelta al flujo manual (WelcomeScreen) — ya sea porque ya se había intentado en esta
// pestaña (evita un bucle si, p.ej., la sesión de Google también ha caducado) o porque el propio
// signinRedirect() falló.
export async function attemptAutoRelogin(
  signinRedirect: (args?: SigninRedirectArgs) => Promise<void>,
  redirectTo?: string | null,
): Promise<boolean> {
  if (hasAttemptedAutoRelogin()) return false;

  markAutoReloginAttempted();

  try {
    await signinRedirect({ state: { redirectTo: redirectTo || undefined } });
    return true;
  } catch (error) {
    console.error('No se pudo reintentar el login automáticamente:', error);
    return false;
  }
}
