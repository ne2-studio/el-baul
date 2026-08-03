# 4. Remove personal (persona-targeted) invitations

## Status

Accepted — 2026-08-03

## Context

Since [ADR 0003](0003-self-serve-baul-join-link.md), two invitation paths coexisted: the
original personal invitations (a Persona created up front, its own targeted link shared
person-to-person) and the global, reusable baúl invite link. In practice the global link
covers the only invitation flow the product surfaces to users — the "Invitar a la familia"
CTA on the baúl screen — and maintaining a second, parallel path (a distinct anonymous
preview endpoint, its own accept endpoint, its own domain method to link an account to a
pre-existing Persona) was no longer justified by any active use case.

## Decision

Remove the personal invitation flow entirely:

- Backend: `GET /api/personas/{personaId}/invite-preview`, `POST
  /api/personas/{personaId}/accept-invite`, `PersonaManager.GetInvitePreviewAsync` /
  `AcceptPersonalInviteAsync`, `BaulPreviewDto`, and `Persona.AcceptInvite`.
- Frontend (`app/`): the "Compartir invitación" action on the persona detail screen, its
  routes (`/invitacion/persona/:personaId` and its accept route), and the
  `canSharePersonaInvite` permission.

A Persona row can still be created ahead of time (`CreatePersonaAsync`, admin-only, used for
pre-provisioning a named family member before they've joined) — only the targeted,
per-Persona invitation link is gone. The only way to grow a baúl's membership going forward
is the global invite link from ADR 0003.

## Consequences

- `docs/API-CONVENTIONS.md`'s Invitations section now describes a single flow.
- ADR 0003's "two coexisting paths" framing is superseded; it remains as a historical record
  of why the global link was introduced.
- Any Persona created without ever being linked to an account (`userId: null`) now has no
  self-serve way to be claimed by its intended recipient — an admin must either grant access
  through the global link (which auto-creates or reuses a Persona for the joining account) or
  the two remain separate, unmerged records. Duplicate-Persona merging is still out of scope,
  as it was in ADR 0003.
