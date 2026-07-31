# 3. Self-serve baúl join link alongside person-to-person invitations

## Status

Accepted — 2026-07-31

## Context

Growing a baúl (family archive) previously required the custodio/administrador to create a
Persona for each family member up front and share that Persona's own invitation link — one
person at a time. User validation sessions repeatedly surfaced this as the largest friction
point after creating a baúl: inviting several relatives meant repeating the same
create-Persona-then-share flow once per person, and custodios routinely postponed inviting
anyone at all, leaving baúles single-member.

`docs/API-CONVENTIONS.md` previously documented this as a deliberate constraint: "Growth is
strictly person-to-person, never a generic join link... There is no self-serve 'join this
baúl' flow." This ADR exists specifically because the approved PRD (2026-07-31, "Enlace
global para invitar a la familia") overturns that documented invariant — per
[`ARCHITECTURE.md`](../ARCHITECTURE.md)'s rule that such exceptions get an ADR.

## Decision

Add a second, coexisting invitation path: one reusable, regenerable, non-expiring invite link
per baúl (`BaulInviteLink`), modeled directly on the existing `SharedLink` pattern (opaque
unguessable token, soft-revoke via `RevokedAt`, revoke-and-recreate on regenerate rather than
mutating the token in place, and a partial unique index guaranteeing at most one active link
per baúl). Anyone with the link can preview the baúl publicly
(`GET /api/baul-invites/{token}/preview`) and, once signed in, join it
(`POST /api/baul-invites/{token}/accept`).

Joining auto-creates a Persona if the caller doesn't already have one in that baúl — nickname
and name taken from the account, avatar imported best-effort from the OIDC `picture` claim
(never blocking the join if the claim is absent or the fetch fails). Joining is a no-op if
the caller already has active access, including the custodio opening their own link. Joining
is explicitly rejected if the caller's existing Persona in that baúl is `sin_acceso` — the
global link cannot be used to self-reinstate revoked access; that still requires an admin,
preserving the one part of the old invariant that matters for safety.

Explicitly out of scope for this iteration: link expiry, usage limits, per-link permission
tiers, QR codes, and duplicate-Persona merging/resolution — a user later added as a second,
separate Persona in the same baúl is not detected or merged.

## Consequences

- `docs/API-CONVENTIONS.md`'s Invitations section now describes both flows; personal
  invitations are unchanged and remain the only way to pre-provision a named, unclaimed
  Persona ahead of an invite going out.
- New anonymous route surface: `GET /api/baul-invites/{token}/preview`, rate-limited with the
  same `PublicLimiter` policy as the personal-invite preview endpoint.
- Persona auto-creation on accept (`BaulInviteLinkManager.AcceptAsync`) bypasses the
  admin-only authorization path that gates `PersonaManager.CreatePersonaAsync` — the caller
  is authorizing themselves by presenting a baúl-scoped token bearer link, not by baúl-admin
  privilege. Any future tightening of Persona creation (e.g. rate-limiting joins per baúl)
  needs to account for this second creation path, not just `CreatePersonaAsync`.
- Regenerating a link immediately breaks any previously shared copy of the old one (a
  WhatsApp message, etc.) — the "Regenerar enlace" UI surfaces this explicitly rather than
  silently swapping the token underneath a custodio who might not expect it.
