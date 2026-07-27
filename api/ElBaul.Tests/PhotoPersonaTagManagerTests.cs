using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class PhotoPersonaTagManagerTests
{
    private const string CustodioId = "custodio-1";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryPhotoPersonaTagRepository _photoPersonaTagRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    private PhotoPersonaTagManager CreateManager(string currentUserId) =>
        new(NullLogger<PhotoPersonaTagManager>.Instance, _photoRepository, _baulRepository, _photoStorage, _clock,
            new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance),
            _photoPersonaTagRepository);

    private async Task<(Guid baulId, Guid chapterId)> SeedBaulWithChapterAsync()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), CustodioId, "Custodio", BaulRole.Custodio, _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        return (baulId, chapterId);
    }

    [Fact]
    public async Task SetTaggedPersonasAsync_ShouldTagPersonas_ThenGetTaggedPersonasAsync_ShouldReturnThem()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuelo Antonio", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var setResult = await manager.SetTaggedPersonasAsync(photoId, [personaId]);

        Assert.True(setResult.IsSuccess);
        Assert.Equal("Abuelo Antonio", Assert.Single(setResult.Value).Nickname);

        var getResult = await manager.GetTaggedPersonasAsync(photoId);
        Assert.True(getResult.IsSuccess);
        Assert.Equal(personaId.ToString(), Assert.Single(getResult.Value).Id);
    }

    [Fact]
    public async Task SetTaggedPersonasAsync_ShouldReplaceThePreviousTagSet()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        var firstPersonaId = Guid.NewGuid();
        var secondPersonaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(firstPersonaId), new BaulId(baulId), null, "Primera", BaulRole.Colaborador, _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(secondPersonaId), new BaulId(baulId), null, "Segunda", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        await manager.SetTaggedPersonasAsync(photoId, [firstPersonaId]);
        var result = await manager.SetTaggedPersonasAsync(photoId, [secondPersonaId]);

        Assert.True(result.IsSuccess);
        Assert.Equal("Segunda", Assert.Single(result.Value).Nickname);
    }

    [Fact]
    public async Task SetTaggedPersonasAsync_ShouldFail_WhenPersonaBelongsToAnotherBaul()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var otherBaulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(otherBaulId), "Otro", null, "someone-else", 0, _clock.UtcNow(), _clock.UtcNow()));
        var foreignPersonaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(foreignPersonaId), new BaulId(otherBaulId), null, "Ajeno", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetTaggedPersonasAsync(photoId, [foreignPersonaId]);

        Assert.True(result.IsFailure);
        Assert.Equal("Persona not found", result.Error);
        Assert.Empty((await manager.GetTaggedPersonasAsync(photoId)).Value);
    }

    [Fact]
    public async Task SetTaggedPersonasAsync_ShouldFail_WhenPhotoNotFound()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.SetTaggedPersonasAsync(Guid.NewGuid(), []);

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error);
    }

    [Fact]
    public async Task AddTaggedPersonasBatchAsync_ShouldTagEveryPhoto_WithTheGivenPersonas()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuelo Antonio", BaulRole.Colaborador, _clock.UtcNow()));
        var firstPhotoId = Guid.NewGuid();
        var secondPhotoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(firstPhotoId), new ChapterId(chapterId), new BaulId(baulId), "key-1", null, CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(secondPhotoId), new ChapterId(chapterId), new BaulId(baulId), "key-2", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.AddTaggedPersonasBatchAsync(baulId, [firstPhotoId, secondPhotoId], [personaId]);

        Assert.True(result.IsSuccess);
        Assert.Equal([firstPhotoId.ToString(), secondPhotoId.ToString()], result.Value);
        Assert.Contains(new PersonaId(personaId), await _photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(new PhotoId(firstPhotoId)));
        Assert.Contains(new PersonaId(personaId), await _photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(new PhotoId(secondPhotoId)));
    }

    [Fact]
    public async Task AddTaggedPersonasBatchAsync_ShouldAddToExistingTags_WithoutRemovingThem()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var existingPersonaId = Guid.NewGuid();
        var newPersonaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(existingPersonaId), new BaulId(baulId), null, "Ya etiquetada", BaulRole.Colaborador, _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(newPersonaId), new BaulId(baulId), null, "Nueva", BaulRole.Colaborador, _clock.UtcNow()));
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        await manager.SetTaggedPersonasAsync(photoId, [existingPersonaId]);
        var result = await manager.AddTaggedPersonasBatchAsync(baulId, [photoId], [newPersonaId]);

        Assert.True(result.IsSuccess);
        var tags = await _photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(new PhotoId(photoId));
        Assert.Contains(new PersonaId(existingPersonaId), tags);
        Assert.Contains(new PersonaId(newPersonaId), tags);
    }

    [Fact]
    public async Task AddTaggedPersonasBatchAsync_ShouldSkipPhotos_NotBelongingToTheBaul()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuelo Antonio", BaulRole.Colaborador, _clock.UtcNow()));
        var ownPhotoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(ownPhotoId), new ChapterId(chapterId), new BaulId(baulId), "key-1", null, CustodioId, _clock.UtcNow()));

        var otherBaulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(otherBaulId), "Otro", null, "someone-else", 0, _clock.UtcNow(), _clock.UtcNow()));
        var foreignPhotoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(foreignPhotoId), null, new BaulId(otherBaulId), "key-2", null, "someone-else", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.AddTaggedPersonasBatchAsync(baulId, [ownPhotoId, foreignPhotoId], [personaId]);

        Assert.True(result.IsSuccess);
        Assert.Equal([ownPhotoId.ToString()], result.Value);
        Assert.Empty(await _photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(new PhotoId(foreignPhotoId)));
    }

    [Fact]
    public async Task AddTaggedPersonasBatchAsync_ShouldFail_WhenPersonaBelongsToAnotherBaul()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var otherBaulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(otherBaulId), "Otro", null, "someone-else", 0, _clock.UtcNow(), _clock.UtcNow()));
        var foreignPersonaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(foreignPersonaId), new BaulId(otherBaulId), null, "Ajeno", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.AddTaggedPersonasBatchAsync(baulId, [photoId], [foreignPersonaId]);

        Assert.True(result.IsFailure);
        Assert.Equal("Persona not found", result.Error);
        Assert.Empty(await _photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(new PhotoId(photoId)));
    }

    [Fact]
    public async Task AddTaggedPersonasBatchAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager("someone-else");
        var result = await manager.AddTaggedPersonasBatchAsync(baulId, [photoId], []);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }
}
