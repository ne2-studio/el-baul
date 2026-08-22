// Marca por qué el usuario está entrando a una URL, cuando eso importa para decidir si mostrar
// comportamiento pensado solo para "entradas normales" a la app — hoy el único consumidor es
// BaulRoute, que no quiere proponer la recomendación de contribución justo al abrir un deep
// link desde una notificación push o desde un email (ver ContributionSuggestionContainer). Este
// mismo valor también se manda a analytics.session-open (ver reportSessionOpen) para poder
// desglosar DAU por punto de entrada.
//
// Los emails lo añaden en backend (TrackedLinkBuilder.BuildRedirectUrl) dentro del `path` que
// termina en `?redirectTo=`, así que sobrevive intacto todo el ida-y-vuelta de login (OIDC
// state → CallbackRoute/PublicRoute → navigate(redirectTo)) sin que el frontend tenga que
// tratarlo de forma especial en ningún punto intermedio. Las push notifications lo añaden aquí
// en cliente, en PushNotificationsHandler, justo antes de navegar al deep link.
export const ENTRY_SOURCE_PARAM = 'entry';

export type EntrySource = 'push' | 'email' | 'link' | 'direct';

export function getEntrySource(search: string): EntrySource | null {
  const value = new URLSearchParams(search).get(ENTRY_SOURCE_PARAM);
  return value === 'push' || value === 'email' || value === 'link' || value === 'direct' ? value : null;
}

// `link`/`direct` no llegan con un `entry` explícito (a diferencia de push/email, ver arriba),
// así que se infieren de la URL con la que arrancó la sesión: cualquier ruta que no sea la raíz
// (p.ej. un enlace de baúl/foto compartido, una invitación) cuenta como `link`; aterrizar en la
// raíz sin más (icono de la app, PWA, favorito, URL escrita a mano) cuenta como `direct`. Solo
// se usa para reportar la sesión a analytics.session-open (ver reportSessionOpen) — nunca cambia
// el comportamiento de la UI como sí hacen push/email.
export function resolveEntrySourceForSessionOpen(pathname: string, search: string): EntrySource {
  const explicit = getEntrySource(search);
  if (explicit === 'push' || explicit === 'email') return explicit;
  return pathname === '/' ? 'direct' : 'link';
}
