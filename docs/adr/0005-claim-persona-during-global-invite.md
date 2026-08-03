# 5. Claim a pre-provisioned Persona during the global invite flow

## Status

Accepted — 2026-08-03

## Context

[ADR 0004](0004-remove-personal-invitations.md) removed the only self-serve way for a
pre-provisioned Persona (`userId: null`, created ahead of time by an admin via
`CreatePersonaAsync`) to ever become linked to an account: the personal invitation flow. Left
as-is, joining through the global invite link (ADR 0003) always auto-creates a brand new
Persona for the joining account, so a family member who was already given a named row loses
that identity (nickname, avatar, biografia, any existing photo tags) and ends up as a second,
unrelated Persona instead of reclaiming their own.

## Decision

Add a "who are you" step to the global invite flow, without reintroducing any per-persona
link:

- `GET /api/baul-invites/{token}/claimable-personas` (authenticated) lists the baúl's
  claimable Personas — `Persona.IsClaimable`, i.e. `AccessStatus == Pending` (not yet linked to
  an account, not `sin_acceso`) — as a narrow `ClaimablePersonaDto` (id/nickname/name/avatar
  only; no email, biografia, or other fields a non-member shouldn't see yet).
- `POST /api/baul-invites/{token}/accept` gains an optional `personaId` in its body. When
  present and the target Persona is still claimable and belongs to the same baúl, the account
  is linked to that existing row (`Persona.AcceptInvite`, reinstated from ADR 0004's removal —
  its only caller now is this claim path, not a per-persona URL). When absent, behavior is
  unchanged from ADR 0003: auto-create a new Persona.
- Frontend: `AcceptBaulInviteRoute` fetches the claimable list before accepting. Empty list →
  auto-create as before, no visible change. Non-empty → show `ClaimPersonaScreen` (one tappable
  row per claimable Persona, avatar/nickname/name, modeled on `ShareTargetBaulScreen`'s baúl
  picker) plus a "No soy ninguna de las personas anteriores" option that proceeds with
  auto-create.

## Consequences

- Closes the gap ADR 0004 flagged: a pre-provisioned or previously-revoked-then-reopened
  Persona can now be reclaimed by the right account through the one remaining invite surface,
  without a second link type.
- `Persona.AcceptInvite` exists again, but its caller is exclusively
  `BaulInviteLinkManager.AcceptAsync` — reintroducing it does not reopen ADR 0004's per-persona
  URL/endpoints, which stay removed.
- No new anonymous surface: `claimable-personas` requires authentication, unlike `preview`.
- Still no duplicate-Persona detection/merging (unchanged from ADR 0003): choosing "no soy
  ninguna" when the right Persona was actually listed still produces a second, unrelated row.
