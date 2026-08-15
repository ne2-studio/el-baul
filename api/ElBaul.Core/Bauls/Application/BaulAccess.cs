using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Core.Bauls.Application;
// The single interpretation of "does this user belong to this baúl / are they an
// admin of it" — every manager asks BaulAccessService instead of re-deriving the
// membership rule from Baul.CustodioId and IBaulRepository.GetPersonaByUserIdAsync by hand.
public sealed record BaulAccess(Baul Baul, bool IsCustodio, Persona? Persona)
{
    public bool IsMember => IsCustodio || (Persona is not null && Persona.AccessStatus != PersonaAccessStatus.Revoked);
    public bool IsAdmin => IsCustodio || (Persona?.Role.IsAdmin() ?? false);

    // The caller's assignable permission tier, as a wire string — distinct from custody (see
    // BaulRole.cs and BaulDto.IsCustodio). The custodio's own Persona row is always
    // Administrador (BaulManager.CreateAsync creates it that way, and PersonaManager blocks
    // ever changing it), so this never needs to special-case IsCustodio to stay correct — but
    // spelling it out here keeps that business rule explicit instead of leaning on data staying
    // as expected.
    public string RoleApiString => IsCustodio ? "administrador" : Persona!.Role.ToApiString();
}

public sealed record AccessibleBaul(Baul Baul, bool IsCustodio, BaulRole Role)
{
    public string RoleApiString => Role.ToApiString();
}

public enum AccessLevel { Member, Admin }

public class BaulAccessService(IBaulRepository baulRepository, IPersonaRepository personaRepository, ILogger<BaulAccessService> logger)
{
    private static readonly object EmptyLogContext = new { };

    public async Task<IReadOnlyList<AccessibleBaul>> GetAccessibleAsync(UserId userId)
    {
        var owned = await baulRepository.GetOwnedByUserIdAsync(userId);
        var shared = await baulRepository.GetSharedByUserIdAsync(userId);

        return owned
            .Select(baul => new AccessibleBaul(baul, IsCustodio: true, BaulRole.Administrador))
            .Concat(shared.Select(access => new AccessibleBaul(access.Baul, IsCustodio: false, access.Role)))
            .DistinctBy(access => access.Baul.Id)
            .ToList();
    }

    public async Task<BaulAccess> GetAsync(Baul baul, UserId userId)
    {
        var persona = await personaRepository.GetPersonaByUserIdAsync(baul.Id, userId);
        return new BaulAccess(baul, baul.IsCustodio(userId), persona);
    }

    // Consolidates the "load the baúl → fail if missing → check membership/role → fail if
    // unauthorized" sequence every manager needs before acting on a baúl-scoped resource.
    // `operation` and optional `logContext` feed a single, uniform log line on either failure.
    public async Task<Result<BaulAccess>> AuthorizeAsync(
        BaulId baulId, UserId userId, AccessLevel level, string operation, object? logContext = null)
    {
        logContext ??= EmptyLogContext;
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("{Operation} rejected: baul not found {@Context}", operation, logContext);
            return Result.Failure<BaulAccess>(ApplicationError.NotFound("Baul not found"));
        }

        return await AuthorizeAsync(baul, userId, level, operation, logContext);
    }

    public async Task<Result<BaulAccess>> AuthorizeAsync(
        Baul baul, UserId userId, AccessLevel level, string operation, object? logContext = null)
    {
        logContext ??= EmptyLogContext;
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
