using ElBaul.Core.Personas.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;

using ElBaul.Tests.Fakes;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class AuthorInfoProjectorTests
{
    private const string CustodioId = "custodio-1";

    private readonly InMemoryPersonaRepository _personaRepository = new();
    private readonly InMemoryBaulRepository _baulRepository;
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private static readonly DateTime Now = new(2026, 8, 5, 12, 0, 0, DateTimeKind.Utc);

    public AuthorInfoProjectorTests()
    {
        _baulRepository = new InMemoryBaulRepository(_personaRepository);
    }

    private AuthorInfoProjector CreateProjector() => new(_personaRepository, _photoRepository, _photoStorage);

    private async Task<BaulId> SeedBaulAsync()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, new UserId(CustodioId), 0, Now, Now));
        return baulId;
    }

    [Fact]
    public async Task GetAsync_ShouldUsePersonaNicknameAndPersonaId()
    {
        var baulId = await SeedBaulAsync();
        var personaId = new PersonaId(Guid.NewGuid());
        await _personaRepository.AddPersonaAsync(new Persona(personaId, baulId, new UserId(CustodioId), "Tito Recuerdos", BaulRole.Administrador, Now));

        var author = await CreateProjector().GetAsync(baulId, new UserId(CustodioId));

        Assert.Equal("Tito Recuerdos", author.Nickname);
        Assert.Equal(personaId.ToString(), author.PersonaId);
    }

    [Fact]
    public async Task GetAsync_ShouldFallBackToUsuario_WhenTheUserHasNoPersonaInThisBaul()
    {
        var baulId = await SeedBaulAsync();

        var author = await CreateProjector().GetAsync(baulId, new UserId("unknown-user"));

        Assert.Equal("Usuario", author.Nickname);
        Assert.Null(author.PersonaId);
        Assert.Null(author.AvatarUrl);
    }

    [Fact]
    public async Task GetManyAsync_ShouldResolveEveryDistinctAuthor_InOnePass()
    {
        var baulId = await SeedBaulAsync();
        const string author1 = "author-1";
        const string author2 = "author-2";
        await _personaRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(author1), "Ana", BaulRole.Colaborador, Now));
        await _personaRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(author2), "Beto", BaulRole.Colaborador, Now));

        var authors = await CreateProjector().GetManyAsync(baulId, [new UserId(author1), new UserId(author1), new UserId(author1), new UserId(author2)]);

        Assert.Equal("Ana", authors[new UserId(author1)].Nickname);
        Assert.Equal("Beto", authors[new UserId(author2)].Nickname);
    }

    [Fact]
    public async Task GetManyAsync_ShouldOmitUnresolvedUsers_AndResolveFallsBackToUsuario()
    {
        var baulId = await SeedBaulAsync();

        var authors = await CreateProjector().GetManyAsync(baulId, [new UserId("unknown-user")]);

        Assert.False(authors.ContainsKey(new UserId("unknown-user")));
        var resolved = AuthorInfoProjector.Resolve(authors, new UserId("unknown-user"));
        Assert.Equal("Usuario", resolved.Nickname);
    }

    [Fact]
    public async Task GetManyAsync_ShouldResolvePhotoBackedAvatar_ViaBatchedPhotoLookup()
    {
        var baulId = await SeedBaulAsync();
        var photoId = new PhotoId(Guid.NewGuid());
        await _photoRepository.CreateAsync(Photo.Create(photoId, null, baulId, "photo-key", null, new UserId(CustodioId), Now));
        await _personaRepository.AddPersonaAsync(new Persona(
            new PersonaId(Guid.NewGuid()), baulId, new UserId(CustodioId), "Custodio", BaulRole.Administrador, Now, AvatarPhotoId: photoId));

        var authors = await CreateProjector().GetManyAsync(baulId, [new UserId(CustodioId)]);

        Assert.Equal("https://imgproxy.test/PersonaAvatar/photo-key", authors[new UserId(CustodioId)].AvatarUrl);
    }
}
