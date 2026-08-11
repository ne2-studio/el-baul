// El deep link nativo (studio.ne2.elbaul://…) es el único punto de entrada por el que el
// proveedor OIDC puede devolver el control a la app en Android/iOS — no hay navegación de
// página como en web (ver main.tsx). Esta decisión decide si una URL dada es realmente ese
// callback, separada de main.tsx para poder probarla sin Capacitor ni UserManager.
const NATIVE_DEEP_LINK_PROTOCOL = 'studio.ne2.elbaul:';

// El logout reutiliza este mismo esquema como post_logout_redirect_uri (ver main.tsx) pero sin
// `code`/`error`: signoutRedirect() ya limpió la sesión local antes de navegar fuera de la app,
// así que no hay nada que canjear ahí — solo un `code` o un `error` indican un intercambio de
// OIDC pendiente de completar.
export function isNativeOidcCallbackUrl(url: string): boolean {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  if (parsedUrl.protocol !== NATIVE_DEEP_LINK_PROTOCOL) {
    return false;
  }

  const { searchParams } = parsedUrl;
  return searchParams.has('code') || searchParams.has('error');
}
