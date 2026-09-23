using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Tests;

// Focused coverage of the Persona access lifecycle itself: AccessStatus's derivation from
// UserId, and the AcceptInvite/IssueInviteToken/RevokeAccess/Unlink/IsCustodioProtected
// transitions. PersonaManagerTests keeps one scenario per capability to prove wiring/
// authorization; this file owns the state rule so those scenarios don't need to re-verify the
// combinatorics too.
public class PersonaAccessLifecycleTests
{
    private const string OwnerUserId = "user-1";
    private const string CustodioUserId = "custodio-1";

    private static readonly BaulId TestBaulId = new(Guid.NewGuid());

    private static Persona MakePersona(BaulRole role, string? userId, string? name = null, string? inviteToken = null) =>
        new(new PersonaId(Guid.NewGuid()), TestBaulId, userId is null ? null : new UserId(userId), "Nick", role, DateTime.UtcNow,
            Name: name, InviteToken: inviteToken);

    // --- AccessStatus ---

    [Fact]
    public void AccessStatus_ShouldBePending_WhenNotClaimed()
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

    // --- AcceptInvite ---

    [Fact]
    public void AcceptInvite_ShouldLinkTheUser_AndMoveToActive()
    {
        var persona = MakePersona(BaulRole.Colaborador, userId: null);

        var accepted = persona.AcceptInvite(new UserId(OwnerUserId), "Fallback Name");

        Assert.Equal(OwnerUserId, accepted.UserId);
        Assert.Equal(PersonaAccessStatus.Active, accepted.AccessStatus);
        Assert.Equal("Fallback Name", accepted.Name);
    }

    [Fact]
    public void AcceptInvite_ShouldNeverOverwriteAnExistingName_WithTheFallback()
    {
        var persona = MakePersona(BaulRole.Colaborador, userId: null, name: "Admin-set name");

        var accepted = persona.AcceptInvite(new UserId(OwnerUserId), "Fallback Name");

        Assert.Equal("Admin-set name", accepted.Name);
    }

    // --- IssueInviteToken ---

    [Fact]
    public void IssueInviteToken_ShouldSetTheToken_WhenNoneExistsYet()
    {
        var persona = MakePersona(BaulRole.Colaborador, userId: null);

        var issued = persona.IssueInviteToken("new-token");

        Assert.Equal("new-token", issued.InviteToken);
    }

    [Fact]
    public void IssueInviteToken_ShouldKeepTheExistingToken_InsteadOfTheCandidate()
    {
        // Re-tapping "Invitar" re-shares the same link, it never mints a fresh one while the
        // persona stays Pending — see Persona.IssueInviteToken.
        var persona = MakePersona(BaulRole.Colaborador, userId: null, inviteToken: "existing-token");

        var issued = persona.IssueInviteToken("candidate-token");

        Assert.Equal("existing-token", issued.InviteToken);
    }

    // --- RevokeAccess ---

    [Fact]
    public void RevokeAccess_ShouldClearTheUserLink_AndMoveBackToPending()
    {
        var persona = MakePersona(BaulRole.Colaborador, OwnerUserId, inviteToken: "some-token");

        var revoked = persona.RevokeAccess();

        Assert.Null(revoked.UserId);
        Assert.Equal(PersonaAccessStatus.Pending, revoked.AccessStatus);
    }

    [Fact]
    public void RevokeAccess_ShouldInvalidateTheOldInviteToken()
    {
        // Explicit exception to invite tokens otherwise being permanent/non-regenerable — a
        // revoked persona's old per-person link must stop working (see the ticket's refinement
        // Q&A). Re-inviting later lazily issues a brand new one.
        var persona = MakePersona(BaulRole.Colaborador, OwnerUserId, inviteToken: "some-token");

        var revoked = persona.RevokeAccess();

        Assert.Null(revoked.InviteToken);
    }

    [Fact]
    public void RevokeAccess_ShouldSetRoleToSinAcceso()
    {
        var persona = MakePersona(BaulRole.Administrador, OwnerUserId);

        var revoked = persona.RevokeAccess();

        Assert.Equal(BaulRole.SinAcceso, revoked.Role);
    }

    // --- Unlink ---

    [Fact]
    public void Unlink_ShouldClearTheUserLink_AndTheInviteToken()
    {
        var persona = MakePersona(BaulRole.Colaborador, OwnerUserId, inviteToken: "some-token");

        var unlinked = persona.Unlink();

        Assert.Null(unlinked.UserId);
        Assert.Null(unlinked.InviteToken);
        Assert.Equal(PersonaAccessStatus.Pending, unlinked.AccessStatus);
    }

    // --- IsCustodioProtected ---

    [Fact]
    public void IsCustodioProtected_ShouldBeTrue_WhenUserIdMatchesTheBaulsCustodio()
    {
        // Custody lives solely on Baul.CustodioId (see BaulRole.cs) — the Persona row's own
        // Role plays no part in this, regardless of what it happens to be.
        var persona = MakePersona(BaulRole.Administrador, CustodioUserId);

        Assert.True(persona.IsCustodioProtected(new UserId(CustodioUserId)));
    }

    [Fact]
    public void IsCustodioProtected_ShouldBeFalse_ForAnOrdinaryMember()
    {
        var persona = MakePersona(BaulRole.Colaborador, OwnerUserId);

        Assert.False(persona.IsCustodioProtected(new UserId(CustodioUserId)));
    }
}
