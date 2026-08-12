// Marca por qué el usuario está entrando a una URL, cuando eso importa para decidir si mostrar
// comportamiento pensado solo para "entradas normales" a la app — hoy el único consumidor es
// BaulRoute, que no quiere proponer la recomendación de contribución justo al abrir un deep
// link desde una notificación push o desde un email (ver ContributionSuggestionContainer).
//
// Los emails lo añaden en backend (TrackedLinkBuilder.BuildRedirectUrl) dentro del `path` que
// termina en `?redirectTo=`, así que sobrevive intacto todo el ida-y-vuelta de login (OIDC
// state → CallbackRoute/PublicRoute → navigate(redirectTo)) sin que el frontend tenga que
// tratarlo de forma especial en ningún punto intermedio. Las push notifications lo añaden aquí
// en cliente, en PushNotificationsHandler, justo antes de navegar al deep link.
export const ENTRY_SOURCE_PARAM = 'entry';

export type EntrySource = 'push' | 'email';

export function getEntrySource(search: string): EntrySource | null {
  const value = new URLSearchParams(search).get(ENTRY_SOURCE_PARAM);
  return value === 'push' || value === 'email' ? value : null;
}
