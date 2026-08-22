// Recuerda en qué punto de scroll estaba cada pestaña de BaulRoute para poder devolver a la
// persona ahí al volver de un Capítulo (o de una Persona, mismo mecanismo de returnTab) — sin
// esto, "Volver" siempre reabre la pestaña de origen pero arriba del todo. Vive en sessionStorage
// (no en un store): es puramente posicional, no hace falta que sobreviva a un refresco de página
// ni que se comparta entre pestañas del navegador.
const KEY_PREFIX = 'baul-tab-scroll:';

function storageKey(baulId: string, tab: string): string {
  return `${KEY_PREFIX}${baulId}:${tab}`;
}

export function saveBaulScrollPosition(baulId: string, tab: string): void {
  try {
    sessionStorage.setItem(storageKey(baulId, tab), String(window.scrollY));
  } catch {
    // sessionStorage puede no estar disponible (modo privado, webview restringido) — perder la
    // posición de scroll no es crítico, no debe bloquear la navegación al capítulo.
  }
}

export function readBaulScrollPosition(baulId: string, tab: string): number | undefined {
  try {
    const raw = sessionStorage.getItem(storageKey(baulId, tab));
    return raw === null ? undefined : Number(raw);
  } catch {
    return undefined;
  }
}
