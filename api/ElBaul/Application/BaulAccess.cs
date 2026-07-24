using ElBaul.Ports.Output;

namespace ElBaul.Application;

// The single interpretation of "does this user belong to this baúl / are they an
// admin of it" — every manager asks BaulAccessService instead of re-deriving the
// membership rule from Baul.CustodioId and IBaulRepository.GetPersonaByUserIdAsync by hand.
public sealed record BaulAccess(Baul Baul, bool IsCustodio, Persona? Persona)
{
    public bool IsMember => IsCustodio || Persona is not null;
    public bool IsAdmin => IsCustodio || (Persona?.Role.IsAdmin() ?? false);
    public BaulRole Role => IsCustodio ? BaulRole.Custodio : Persona!.Role;
}

public class BaulAccessService(IBaulRepository baulRepository)
{
    public async Task<BaulAccess> GetAsync(Baul baul, string userId)
    {
        var persona = await baulRepository.GetPersonaByUserIdAsync(baul.Id, userId);
        return new BaulAccess(baul, baul.CustodioId == userId, persona);
    }
}
