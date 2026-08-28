// Marca por qué el usuario está entrando a una URL, cuando eso importa para decidir si mostrar
// comportamiento pensado solo para "entradas normales" a la app — hoy el único consumidor es
// BaulRoute, que no quiere proponer la recomendación de contribución justo al abrir un deep
// link desde una notificación push, un email o un enlace compartido (ver
// ContributionSuggestionContainer). Este mismo valor también se manda a analytics.session-open
// (ver reportSessionOpen) para poder desglosar DAU por punto de entrada.
//
// Los cuatro valores llegan SIEMPRE como un `entry` explícito en la URL, puesto en origen por
// quien genera el enlace, y viaja intacto todo el ida-y-vuelta de login (OIDC state →
// CallbackRoute/PublicRoute → navigate(redirectTo)) porque los AuthGuards arrastran
// `pathname + search` dentro de `redirectTo`:
//   - `email` lo añade el backend en TrackedLinkBuilder.BuildRedirectUrl.
//   - `push`  lo añade el cliente en PushNotificationsHandler antes de navegar al deep link.
//   - `link`  lo añade el backend en los CTA de las landings de enlace compartido / invitación
//             (SharedLinkManager.BuildAppUrl, PersonaInviteManager.BuildAppUrl) y el cliente lo
//             propaga por los saltos internos del flujo de invitación (ver appendEntrySource en
//             BaulGlobalInvitacionRoute / AcceptBaulInviteRoute).
//   - `direct` no lo añade nadie: es el valor por descarte.
export const ENTRY_SOURCE_PARAM = 'entry';

export type EntrySource = 'push' | 'email' | 'link' | 'direct';

export function getEntrySource(search: string): EntrySource | null {
  const value = new URLSearchParams(search).get(ENTRY_SOURCE_PARAM);
  return value === 'push' || value === 'email' || value === 'link' || value === 'direct' ? value : null;
}

// Cualquier apertura sin un `entry` explícito y reconocido cuenta como `direct`: icono de la
// app, PWA, favorito, URL escrita a mano... y también cualquier enlace compartido al que se le
// haya olvidado poner `entry=link`. Es un subconteo consciente de `link` — se prefiere a
// inflarlo, que es lo que pasaba cuando `link` se infería de "la URL actual no es la raíz", una
// señal que casi siempre era cierta para cuando se reportaba la sesión (el Router ya había
// redirigido fuera de `/`). Solo se usa para reportar la sesión a analytics.session-open (ver
// reportSessionOpen) — nunca cambia el comportamiento de la UI como sí hacen push/email/link.
export function resolveEntrySourceForSessionOpen(search: string): EntrySource {
  return getEntrySource(search) ?? 'direct';
}

// Añade `entry=<source>` a una ruta interna para que el punto de entrada sobreviva a los saltos
// que da la app antes de reportar la sesión (onboarding, login OIDC...). Mismo truco que el
// backend hace para email en TrackedLinkBuilder.WithEmailEntrySource.
export function appendEntrySource(path: string, source: EntrySource): string {
  return `${path}${path.includes('?') ? '&' : '?'}${ENTRY_SOURCE_PARAM}=${source}`;
}
