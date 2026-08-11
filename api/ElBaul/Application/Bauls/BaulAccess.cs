using ElBaul.Application.Bauls;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Shared;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Application.Bauls;
// The single interpretation of "does this user belong to this baúl / are they an
// admin of it" — every manager asks BaulAccessService instead of re-deriving the
// membership rule from Baul.CustodioId and IBaulRepository.GetPersonaByUserIdAsync by hand.
public sealed record BaulAccess(Baul Baul, bool IsCustodio, Persona? Persona)
{
    public bool IsMember => IsCustodio || (Persona is not null && Persona.AccessStatus != PersonaAccessStatus.Revoked);
    public bool IsAdmin => IsCustodio || (Persona?.Role.IsAdmin() ?? false);
    public BaulRole Role => IsCustodio ? BaulRole.Custodio : Persona!.Role;
}

public enum AccessLevel { Member, Admin }

public class BaulAccessService(IBaulRepository baulRepository, ILogger<BaulAccessService> logger)
{
    public async Task<BaulAccess> GetAsync(Baul baul, string userId)
    {
        var persona = await baulRepository.GetPersonaByUserIdAsync(baul.Id, userId);
        return new BaulAccess(baul, baul.CustodioId == userId, persona);
    }

    // Consolidates the "load the baúl → fail if missing → check membership/role → fail if
    // unauthorized" sequence every manager needs before acting on a baúl-scoped resource.
    // `operation` and `logContext` feed a single, uniform log line on either failure.
    public async Task<Result<BaulAccess>> AuthorizeAsync(
        BaulId baulId, string userId, AccessLevel level, string operation, object logContext)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("{Operation} rejected: baul not found {@Context}", operation, logContext);
            return Result.Failure<BaulAccess>(ApplicationError.NotFound("Baul not found"));
        }

        return await AuthorizeAsync(baul, userId, level, operation, logContext);
    }

    public async Task<Result<BaulAccess>> AuthorizeAsync(
        Baul baul, string userId, AccessLevel level, string operation, object logContext)
    {
        var access = await GetAsync(baul, userId);
        var authorized = level == AccessLevel.Admin ? access.IsAdmin : access.IsMember;
        if (!authorized)
        {
            logger.LogWarning("{Operation} rejected: access denied {@Context}", operation, logContext);
            return Result.Failure<BaulAccess>(ApplicationError.Forbidden("Access denied"));
        }

        return Result.Success(access);
    }
}
