using ElBaul.Core.Personas.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Tests.Fakes;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class PersonaDtoProjectorTests
{
    [Fact]
    public async Task ProjectAsync_ShouldNotResolveUser_ForUnclaimedPersona()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var custodioId = new UserId("custodio-1");
        var persona = new Persona(
            new PersonaId(Guid.NewGuid()), baulId, null, "Abuela", BaulRole.Colaborador,
            new DateTime(2026, 8, 11, 12, 0, 0, DateTimeKind.Utc), Name: "María");
        var projector = new PersonaDtoProjector(
            new InMemoryPhotoRepository(), new FakePhotoStorage(), new InMemoryUserRepository());

        var dto = await projector.ProjectAsync(persona, canEdit: false, custodioId);

        Assert.Null(dto.UserId);
        Assert.Null(dto.Email);
        Assert.Equal("María", dto.Name);
        Assert.Equal("Abuela", dto.Nickname);
        Assert.Equal("pending", dto.Status);
    }
}
