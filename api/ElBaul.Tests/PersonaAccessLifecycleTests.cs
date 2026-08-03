using ElBaul.Ports.Output;

namespace ElBaul.Tests;

// Focused coverage of the Persona access lifecycle itself: AccessStatus's derivation from
// (Role, UserId), and the AcceptInvite/Revoke/IsCustodioProtected transitions. PersonaManagerTests
// keeps one scenario per capability to prove wiring/authorization; this file owns the state
// rule so those scenarios don't need to re-verify the combinatorics too.
public class PersonaAccessLifecycleTests
{
    private const string OwnerUserId = "user-1";
    private const string CustodioUserId = "custodio-1";

    private static readonly BaulId TestBaulId = new(Guid.NewGuid());

    private static Persona MakePersona(BaulRole role, string? userId, string? name = null) =>
        new(new PersonaId(Guid.NewGuid()), TestBaulId, userId, "Nick", role, DateTime.UtcNow, Name: name);

    // --- AccessStatus ---

    [Fact]
    public void AccessStatus_ShouldBePending_WhenNotClaimedAndNotRevoked()
    {
        var persona = MakePersona(BaulRole.Colaborador, userId: null);

        Assert.Equal(PersonaAccessStatus.Pending, persona.AccessStatus);
    }

    [Fact]
    public void AccessStatus_ShouldBeActive_WhenClaimed()
    {
        var persona = MakePersona(BaulRole.Colaborador, OwnerUserId);

        Assert.Equal(PersonaAccessStatus.Active, persona.AccessStatus);
    }

    [Fact]
    public void AccessStatus_ShouldBeRevoked_WhenRoleIsSinAcceso_RegardlessOfUserId()
    {
        var persona = MakePersona(BaulRole.SinAcceso, userId: null);

        Assert.Equal(PersonaAccessStatus.Revoked, persona.AccessStatus);
    }

    // --- AcceptInvite ---

    [Fact]
    public void AcceptInvite_ShouldLinkTheUser_AndMoveToActive()
    {
        var persona = MakePersona(BaulRole.Colaborador, userId: null);

        var accepted = persona.AcceptInvite(OwnerUserId, "Fallback Name");

        Assert.Equal(OwnerUserId, accepted.UserId);
        Assert.Equal(PersonaAccessStatus.Active, accepted.AccessStatus);
        Assert.Equal("Fallback Name", accepted.Name);
    }

    [Fact]
    public void AcceptInvite_ShouldNeverOverwriteAnExistingName_WithTheFallback()
    {
        var persona = MakePersona(BaulRole.Colaborador, userId: null, name: "Admin-set name");

        var accepted = persona.AcceptInvite(OwnerUserId, "Fallback Name");

        Assert.Equal("Admin-set name", accepted.Name);
    }

    // --- Revoke ---

    [Fact]
    public void Revoke_ShouldClearTheUserLink_AndMoveToRevoked()
    {
        var persona = MakePersona(BaulRole.Colaborador, OwnerUserId);

        var revoked = persona.Revoke();

        Assert.Null(revoked.UserId);
        Assert.Equal(PersonaAccessStatus.Revoked, revoked.AccessStatus);
    }

    [Fact]
    public void Revoke_ThenAcceptInvite_ShouldReturnToPending_NotActive()
    {
        // Mirrors the "reopen" path: an admin resets Role away from SinAcceso via
        // UpdatePersonaRoleAsync, leaving UserId null, so the row is Pending again — accepting
        // a fresh invite is what moves it to Active, never revocation-then-role-change alone.
        var persona = MakePersona(BaulRole.Colaborador, OwnerUserId);

        var reopened = persona.Revoke() with { Role = BaulRole.Colaborador };

        Assert.Equal(PersonaAccessStatus.Pending, reopened.AccessStatus);
    }

    // --- IsCustodioProtected ---

    [Fact]
    public void IsCustodioProtected_ShouldBeTrue_ForARowStampedCustodio()
    {
        var persona = MakePersona(BaulRole.Custodio, CustodioUserId);

        Assert.True(persona.IsCustodioProtected(CustodioUserId));
    }

    [Fact]
    public void IsCustodioProtected_ShouldBeTrue_WhenUserIdMatchesTheBaulsCustodio_EvenWithoutCustodioRole()
    {
        // Defensive: even if a non-Custodio-role row somehow carries the custodio's UserId,
        // it must still be protected from revocation.
        var persona = MakePersona(BaulRole.Administrador, CustodioUserId);

        Assert.True(persona.IsCustodioProtected(CustodioUserId));
    }

    [Fact]
    public void IsCustodioProtected_ShouldBeFalse_ForAnOrdinaryMember()
    {
        var persona = MakePersona(BaulRole.Colaborador, OwnerUserId);

        Assert.False(persona.IsCustodioProtected(CustodioUserId));
    }
}
