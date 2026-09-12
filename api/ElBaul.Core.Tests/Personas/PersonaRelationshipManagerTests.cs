using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Personas.Application;
using ElBaul.Tests.Fakes;
using ElBaul.Tests.Fixtures;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class PersonaRelationshipManagerTests
{
    private const string CustodioId = BaulFixture.DefaultCustodioId;
    private const string OtherUserId = "user-2";

    private readonly BaulFixture _fixture = new();

    private PersonaRelationshipManager CreateManager(string currentUserId) =>
        new(NullLogger<PersonaRelationshipManager>.Instance, _fixture.PersonaRelationships, _fixture.Personas, _fixture.Clock,
            new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance));

    [Fact]
    public async Task AddRelationshipAsync_ShouldCreateRelationship_WhenCallerIsAMemberNotAnAdmin()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        await _fixture.AddColaboradorAsync(baulId, OtherUserId, "Colaborador");
        var parentId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var childId = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        // Any member — not just custodio/administrador — can narrate the family tree, unlike
        // Persona management itself (invite, role changes), which stays admin-only.
        var manager = CreateManager(OtherUserId);
        var result = await manager.AddRelationshipAsync(baulId, parentId, childId);

        Assert.True(result.IsSuccess);
        Assert.Equal(parentId.Value.ToString(), result.Value.ParentId);
        Assert.Equal(childId.Value.ToString(), result.Value.ChildId);
    }

    [Fact]
    public async Task AddRelationshipAsync_ShouldDenyAccess_WhenCallerHasNoAccessToTheBaul()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var parentId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var childId = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        var manager = CreateManager(OtherUserId);
        var result = await manager.AddRelationshipAsync(baulId, parentId, childId);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task AddRelationshipAsync_ShouldReject_WhenPersonaIsRelatedToItself()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");

        var manager = CreateManager(CustodioId);
        var result = await manager.AddRelationshipAsync(baulId, personaId, personaId);

        Assert.True(result.IsFailure);
        Assert.Equal("A persona cannot be related to itself", result.Error.Message);
    }

    [Fact]
    public async Task AddRelationshipAsync_ShouldReject_WhenEitherPersonaIsNotFoundInThisBaul()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var otherBaulId = await _fixture.CreateBaulAsync("Otra familia", custodioId: "other-custodio");
        var parentId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var strangerId = await _fixture.AddPendingPersonaAsync(otherBaulId, "Ajeno");

        var manager = CreateManager(CustodioId);
        var result = await manager.AddRelationshipAsync(baulId, parentId, strangerId);

        Assert.True(result.IsFailure);
        Assert.Equal("Persona not found", result.Error.Message);
    }

    [Fact]
    public async Task AddRelationshipAsync_ShouldReject_WhenARelationshipAlreadyExists()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var parentId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var childId = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        var manager = CreateManager(CustodioId);
        await manager.AddRelationshipAsync(baulId, parentId, childId);
        var result = await manager.AddRelationshipAsync(baulId, parentId, childId);

        Assert.True(result.IsFailure);
        Assert.Equal("A relationship already exists between these personas", result.Error.Message);
    }

    [Fact]
    public async Task AddRelationshipAsync_ShouldReject_WhenTheReverseRelationshipAlreadyExists()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var parentId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var childId = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        var manager = CreateManager(CustodioId);
        await manager.AddRelationshipAsync(baulId, parentId, childId);
        // Creating it from the other end (Pedro -> parent of -> Carmen) must not silently
        // produce a second, contradictory edge between the same two personas.
        var result = await manager.AddRelationshipAsync(baulId, childId, parentId);

        Assert.True(result.IsFailure);
        Assert.Equal("A relationship already exists between these personas", result.Error.Message);
    }

    [Fact]
    public async Task GetRelationshipsAsync_ShouldReturnEveryRelationshipInTheBaul()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var carmenId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var pedroId = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");
        var mariaId = await _fixture.AddPendingPersonaAsync(baulId, "María");

        var manager = CreateManager(CustodioId);
        await manager.AddRelationshipAsync(baulId, carmenId, pedroId);
        await manager.AddRelationshipAsync(baulId, pedroId, mariaId);

        var result = await manager.GetRelationshipsAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count());
    }

    [Fact]
    public async Task RemoveRelationshipAsync_ShouldDeleteTheRelationship_RegardlessOfWhichEndItIsCalledFrom()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var parentId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var childId = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        var manager = CreateManager(CustodioId);
        await manager.AddRelationshipAsync(baulId, parentId, childId);

        // "Borrar desde cualquiera de los extremos elimina la relación" — called with the pair
        // reversed from how it was stored, and it must still resolve to the one relationship.
        var result = await manager.RemoveRelationshipAsync(baulId, childId, parentId);

        Assert.True(result.IsSuccess);
        var remaining = await manager.GetRelationshipsAsync(baulId);
        Assert.Empty(remaining.Value);
    }

    [Fact]
    public async Task RemoveRelationshipAsync_ShouldReject_WhenNoRelationshipExists()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var parentId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var childId = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        var manager = CreateManager(CustodioId);
        var result = await manager.RemoveRelationshipAsync(baulId, parentId, childId);

        Assert.True(result.IsFailure);
        Assert.Equal("Relationship not found", result.Error.Message);
    }
}
