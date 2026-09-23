using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Personas.Application;
using ElBaul.Tests.Fakes;
using ElBaul.Tests.Fixtures;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class PersonaSpouseRelationshipManagerTests
{
    private const string CustodioId = BaulFixture.DefaultCustodioId;
    private const string OtherUserId = "user-2";

    private readonly BaulFixture _fixture = new();

    private PersonaSpouseRelationshipManager CreateManager(string currentUserId) =>
        new(NullLogger<PersonaSpouseRelationshipManager>.Instance, _fixture.PersonaSpouseRelationships, _fixture.Personas, _fixture.Clock,
            new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance));

    [Fact]
    public async Task AddSpouseRelationshipAsync_ShouldCreateRelationship_WhenCallerIsAMemberNotAnAdmin()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        await _fixture.AddColaboradorAsync(baulId, OtherUserId, "Colaborador");
        var personaId1 = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var personaId2 = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        var manager = CreateManager(OtherUserId);
        var result = await manager.AddSpouseRelationshipAsync(baulId, personaId1, personaId2);

        Assert.True(result.IsSuccess);
        Assert.Equal(personaId1.Value.ToString(), result.Value.PersonaId1);
        Assert.Equal(personaId2.Value.ToString(), result.Value.PersonaId2);
    }

    [Fact]
    public async Task AddSpouseRelationshipAsync_ShouldDenyAccess_WhenCallerHasNoAccessToTheBaul()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId1 = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var personaId2 = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        var manager = CreateManager(OtherUserId);
        var result = await manager.AddSpouseRelationshipAsync(baulId, personaId1, personaId2);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task AddSpouseRelationshipAsync_ShouldReject_WhenPersonaIsRelatedToItself()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");

        var manager = CreateManager(CustodioId);
        var result = await manager.AddSpouseRelationshipAsync(baulId, personaId, personaId);

        Assert.True(result.IsFailure);
        Assert.Equal("A persona cannot be related to itself", result.Error.Message);
    }

    [Fact]
    public async Task AddSpouseRelationshipAsync_ShouldReject_WhenEitherPersonaIsNotFoundInThisBaul()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var otherBaulId = await _fixture.CreateBaulAsync("Otra familia", custodioId: "other-custodio");
        var personaId1 = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var strangerId = await _fixture.AddPendingPersonaAsync(otherBaulId, "Ajeno");

        var manager = CreateManager(CustodioId);
        var result = await manager.AddSpouseRelationshipAsync(baulId, personaId1, strangerId);

        Assert.True(result.IsFailure);
        Assert.Equal("Persona not found", result.Error.Message);
    }

    [Fact]
    public async Task AddSpouseRelationshipAsync_ShouldReject_WhenARelationshipAlreadyExists()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId1 = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var personaId2 = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        var manager = CreateManager(CustodioId);
        await manager.AddSpouseRelationshipAsync(baulId, personaId1, personaId2);
        var result = await manager.AddSpouseRelationshipAsync(baulId, personaId1, personaId2);

        Assert.True(result.IsFailure);
        Assert.Equal("A relationship already exists between these personas", result.Error.Message);
    }

    [Fact]
    public async Task AddSpouseRelationshipAsync_ShouldReject_WhenTheReverseRelationshipAlreadyExists()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId1 = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var personaId2 = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        var manager = CreateManager(CustodioId);
        await manager.AddSpouseRelationshipAsync(baulId, personaId1, personaId2);
        // Same pair, ids swapped — must not silently produce a second edge between the same two.
        var result = await manager.AddSpouseRelationshipAsync(baulId, personaId2, personaId1);

        Assert.True(result.IsFailure);
        Assert.Equal("A relationship already exists between these personas", result.Error.Message);
    }

    [Fact]
    public async Task AddSpouseRelationshipAsync_ShouldReject_WhenEitherPersonaAlreadyHasASpouse()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var carmenId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var pedroId = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");
        var mariaId = await _fixture.AddPendingPersonaAsync(baulId, "María");

        var manager = CreateManager(CustodioId);
        await manager.AddSpouseRelationshipAsync(baulId, carmenId, pedroId);

        // El Baúl models monogamous families only: Pedro already has a spouse (Carmen).
        var result = await manager.AddSpouseRelationshipAsync(baulId, pedroId, mariaId);

        Assert.True(result.IsFailure);
        Assert.Equal("This persona already has a spouse", result.Error.Message);
    }

    [Fact]
    public async Task GetSpouseRelationshipsAsync_ShouldReturnEveryRelationshipInTheBaul()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var carmenId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var pedroId = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");
        var mariaId = await _fixture.AddPendingPersonaAsync(baulId, "María");
        var joseId = await _fixture.AddPendingPersonaAsync(baulId, "José");

        var manager = CreateManager(CustodioId);
        await manager.AddSpouseRelationshipAsync(baulId, carmenId, pedroId);
        await manager.AddSpouseRelationshipAsync(baulId, mariaId, joseId);

        var result = await manager.GetSpouseRelationshipsAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count());
    }

    [Fact]
    public async Task RemoveSpouseRelationshipAsync_ShouldDeleteTheRelationship_RegardlessOfWhichEndItIsCalledFrom()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId1 = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var personaId2 = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        var manager = CreateManager(CustodioId);
        await manager.AddSpouseRelationshipAsync(baulId, personaId1, personaId2);

        var result = await manager.RemoveSpouseRelationshipAsync(baulId, personaId2, personaId1);

        Assert.True(result.IsSuccess);
        var remaining = await manager.GetSpouseRelationshipsAsync(baulId);
        Assert.Empty(remaining.Value);
    }

    [Fact]
    public async Task RemoveSpouseRelationshipAsync_ShouldReject_WhenNoRelationshipExists()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId1 = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var personaId2 = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");

        var manager = CreateManager(CustodioId);
        var result = await manager.RemoveSpouseRelationshipAsync(baulId, personaId1, personaId2);

        Assert.True(result.IsFailure);
        Assert.Equal("Relationship not found", result.Error.Message);
    }

    [Fact]
    public async Task RemoveSpouseRelationshipAsync_ShouldAllowAddingANewSpouse_AfterRemoval()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var carmenId = await _fixture.AddPendingPersonaAsync(baulId, "Carmen");
        var pedroId = await _fixture.AddPendingPersonaAsync(baulId, "Pedro");
        var mariaId = await _fixture.AddPendingPersonaAsync(baulId, "María");

        var manager = CreateManager(CustodioId);
        await manager.AddSpouseRelationshipAsync(baulId, carmenId, pedroId);
        await manager.RemoveSpouseRelationshipAsync(baulId, carmenId, pedroId);

        var result = await manager.AddSpouseRelationshipAsync(baulId, pedroId, mariaId);

        Assert.True(result.IsSuccess);
    }
}
