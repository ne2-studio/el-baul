using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Bauls;
public enum AccessLevel { Member, Admin }

// The plain result of an authorization check — deliberately carries no domain types (no Baul,
// no Persona). A caller that only needs to gate an operation ("is this user a member/admin?")
// takes this; a caller that also needs to mutate the baúl itself (WithCover, WithChapterAdded,
// ...) deep-imports Bauls.Application.BaulAccessService/BaulAccess instead, which returns the
// domain entities this type intentionally omits (see backend.md's BaulAccessService note).
public sealed record BaulAuthorization(
    BaulId BaulId, string RoleApiString, bool IsAdmin, bool IsCustodio, PersonaId? PersonaId, UserId CustodioId);

// The public authorization contract for "does this user belong to this baúl / are they an
// admin of it" — implemented by Bauls.Application.BaulAccessService. Managers that only need
// this yes/no (plus role) should depend on this interface, not on BaulAccessService directly.
public interface IBaulAuthorizer
{
    Task<Result<BaulAuthorization>> AuthorizeAsync(
        BaulId baulId, UserId userId, AccessLevel level, string operation, object? logContext = null);
}
