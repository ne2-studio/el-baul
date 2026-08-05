using ElBaul.Application;
using ElBaul.Infra.Lite;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;

namespace ElBaul.Tests;

public class AuthorInfoProjectorTests
{
    private const string CustodioId = "custodio-1";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private static readonly DateTime Now = new(2026, 8, 5, 12, 0, 0, DateTimeKind.Utc);

    private AuthorInfoProjector CreateProjector() => new(_baulRepository, _photoRepository, _photoStorage);

    private async Task<BaulId> SeedBaulAsync()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, Now, Now));
        return baulId;
    }

    [Fact]
    public async Task GetAsync_ShouldUsePersonaNicknameAndPersonaId()
    {
        var baulId = await SeedBaulAsync();
        var personaId = new PersonaId(Guid.NewGuid());
        await _baulRepository.AddPersonaAsync(new Persona(personaId, baulId, CustodioId, "Tito Recuerdos", BaulRole.Custodio, Now));

        var author = await CreateProjector().GetAsync(baulId, CustodioId);

        Assert.Equal("Tito Recuerdos", author.Nickname);
        Assert.Equal(personaId.ToString(), author.PersonaId);
    }

    [Fact]
    public async Task GetAsync_ShouldFallBackToUsuario_WhenTheUserHasNoPersonaInThisBaul()
    {
        var baulId = await SeedBaulAsync();

        var author = await CreateProjector().GetAsync(baulId, "unknown-user");

        Assert.Equal("Usuario", author.Nickname);
        Assert.Null(author.PersonaId);
        Assert.Null(author.AvatarUrl);
    }

    [Fact]
    public async Task GetAsync_ShouldResolveAvatarUrl_FromLegacyAvatarKey()
    {
        var baulId = await SeedBaulAsync();
        await _baulRepository.AddPersonaAsync(new Persona(
            new PersonaId(Guid.NewGuid()), baulId, CustodioId, "Custodio", BaulRole.Custodio, Now, AvatarPhotoKey: "avatar-key"));

        var author = await CreateProjector().GetAsync(baulId, CustodioId);

        Assert.Equal("https://imgproxy.test/PersonaAvatar/avatar-key", author.AvatarUrl);
    }

    [Fact]
    public async Task GetManyAsync_ShouldResolveEveryDistinctAuthor_InOnePass()
    {
        var baulId = await SeedBaulAsync();
        const string author1 = "author-1";
        const string author2 = "author-2";
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, author1, "Ana", BaulRole.Colaborador, Now));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, author2, "Beto", BaulRole.Colaborador, Now));

        var authors = await CreateProjector().GetManyAsync(baulId, [author1, author1, author1, author2]);

        Assert.Equal("Ana", authors[author1].Nickname);
        Assert.Equal("Beto", authors[author2].Nickname);
    }

    [Fact]
    public async Task GetManyAsync_ShouldOmitUnresolvedUsers_AndResolveFallsBackToUsuario()
    {
        var baulId = await SeedBaulAsync();

        var authors = await CreateProjector().GetManyAsync(baulId, ["unknown-user"]);

        Assert.False(authors.ContainsKey("unknown-user"));
        var resolved = AuthorInfoProjector.Resolve(authors, "unknown-user");
        Assert.Equal("Usuario", resolved.Nickname);
    }

    [Fact]
    public async Task GetManyAsync_ShouldResolvePhotoBackedAvatar_ViaBatchedPhotoLookup()
    {
        var baulId = await SeedBaulAsync();
        var photoId = new PhotoId(Guid.NewGuid());
        await _photoRepository.CreateAsync(Photo.Create(photoId, null, baulId, "photo-key", null, CustodioId, Now));
        await _baulRepository.AddPersonaAsync(new Persona(
            new PersonaId(Guid.NewGuid()), baulId, CustodioId, "Custodio", BaulRole.Custodio, Now, AvatarPhotoId: photoId));

        var authors = await CreateProjector().GetManyAsync(baulId, [CustodioId]);

        Assert.Equal("https://imgproxy.test/PersonaAvatar/photo-key", authors[CustodioId].AvatarUrl);
    }
}
