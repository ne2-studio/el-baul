import { Persona } from '../types';

function byNickname(a: Persona, b: Persona): number {
  return a.nickname.localeCompare(b.nickname, 'es');
}

// "Invitar a la familia": personas not yet in the baúl come first (they're the ones needing
// action), already-active personas trail below. Alphabetical within each group. Personas with
// no access (role 'sin_acceso') never appear here, regardless of status — they're never meant
// to be invited.
export function sortPersonasForInvite(personas: Persona[]): Persona[] {
  const invitable = personas.filter((p) => p.role !== 'sin_acceso');
  const pending = invitable.filter((p) => p.status !== 'active').sort(byNickname);
  const active = invitable.filter((p) => p.status === 'active').sort(byNickname);
  return [...pending, ...active];
}

// How many personas are still missing an invite — the same "pending" half sortPersonasForInvite
// puts first, counted rather than sorted. Exported on its own so BaulFeedTabContainer's
// attention banner derives its count from the exact same rule instead of re-deriving the filter.
export function countPendingInvites(personas: Persona[]): number {
  return personas.filter((p) => p.role !== 'sin_acceso' && p.status !== 'active').length;
}

// Tagging pickers (photo tagging, contribution suggestions): personas already in the baúl are
// the likely picks, so they lead; pending invitees trail below. Alphabetical within each group.
export function sortPersonasForTagging(personas: Persona[]): Persona[] {
  const active = personas.filter((p) => p.status === 'active').sort(byNickname);
  const pending = personas.filter((p) => p.status !== 'active').sort(byNickname);
  return [...active, ...pending];
}
