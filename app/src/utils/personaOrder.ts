import { Persona } from '../types';

function byNickname(a: Persona, b: Persona): number {
  return a.nickname.localeCompare(b.nickname, 'es');
}

// "Invitar a la familia": personas not yet in the baúl come first (they're the ones needing
// action), already-active personas trail below. Alphabetical within each group.
export function sortPersonasForInvite(personas: Persona[]): Persona[] {
  const pending = personas.filter((p) => p.status !== 'active').sort(byNickname);
  const active = personas.filter((p) => p.status === 'active').sort(byNickname);
  return [...pending, ...active];
}

// Tagging pickers (photo tagging, contribution suggestions): personas already in the baúl are
// the likely picks, so they lead; pending invitees trail below. Alphabetical within each group.
export function sortPersonasForTagging(personas: Persona[]): Persona[] {
  const active = personas.filter((p) => p.status === 'active').sort(byNickname);
  const pending = personas.filter((p) => p.status !== 'active').sort(byNickname);
  return [...active, ...pending];
}
