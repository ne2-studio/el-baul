using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using ElBaul.Tests.Fixtures;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class PhotoPersonaTagManagerTests
{
    private const string CustodioId = BaulFixture.DefaultCustodioId;

    private readonly BaulFixture _fixture = new();
    private readonly FakePhotoStorage _photoStorage = new();

    private PhotoPersonaTagManager CreateManager(string currentUserId) =>
        new(NullLogger<PhotoPersonaTagManager>.Instance, _fixture.Photos, _fixture.Baules, _photoStorage, _fixture.Clock,
            new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_fixture.Baules, NullLogger<BaulAccessService>.Instance),
            _fixture.PhotoPersonaTags);

    [Fact]
    public async Task SetTaggedPersonasAsync_ShouldTagPersonas_ThenGetTaggedPersonasAsync_ShouldReturnThem()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuelo Antonio");

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
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);
        var firstPersonaId = await _fixture.AddPendingPersonaAsync(baulId, "Primera");
        var secondPersonaId = await _fixture.AddPendingPersonaAsync(baulId, "Segunda");

        var manager = CreateManager(CustodioId);
        await manager.SetTaggedPersonasAsync(photoId, [firstPersonaId]);
        var result = await manager.SetTaggedPersonasAsync(photoId, [secondPersonaId]);

        Assert.True(result.IsSuccess);
        Assert.Equal("Segunda", Assert.Single(result.Value).Nickname);
    }

    [Fact]
    public async Task SetTaggedPersonasAsync_ShouldFail_WhenPersonaBelongsToAnotherBaul()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var otherBaulId = await _fixture.CreateBaulAsync("Otro", "someone-else");
        var foreignPersonaId = await _fixture.AddPendingPersonaAsync(otherBaulId, "Ajeno");

        var manager = CreateManager(CustodioId);
        var result = await manager.SetTaggedPersonasAsync(photoId, [foreignPersonaId]);

        Assert.True(result.IsFailure);
        Assert.Equal("Persona not found", result.Error.Message);
        Assert.Empty((await manager.GetTaggedPersonasAsync(photoId)).Value);
    }

    [Fact]
    public async Task SetTaggedPersonasAsync_ShouldFail_WhenPhotoNotFound()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.SetTaggedPersonasAsync(new PhotoId(Guid.NewGuid()), []);

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);
    }

    [Fact]
    public async Task AddTaggedPersonasBatchAsync_ShouldTagEveryPhoto_WithTheGivenPersonas()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuelo Antonio");
        var firstPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "key-1");
        var secondPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "key-2");

        var manager = CreateManager(CustodioId);
        var result = await manager.AddTaggedPersonasBatchAsync(
            baulId, [firstPhotoId, secondPhotoId], [personaId]);

        Assert.True(result.IsSuccess);
        Assert.Equal([firstPhotoId.ToString(), secondPhotoId.ToString()], result.Value);
        Assert.Contains(personaId, await _fixture.PhotoPersonaTags.GetPersonaIdsByPhotoIdAsync(firstPhotoId));
        Assert.Contains(personaId, await _fixture.PhotoPersonaTags.GetPersonaIdsByPhotoIdAsync(secondPhotoId));
    }

    [Fact]
    public async Task AddTaggedPersonasBatchAsync_ShouldAddToExistingTags_WithoutRemovingThem()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var existingPersonaId = await _fixture.AddPendingPersonaAsync(baulId, "Ya etiquetada");
        var newPersonaId = await _fixture.AddPendingPersonaAsync(baulId, "Nueva");
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var manager = CreateManager(CustodioId);
        await manager.SetTaggedPersonasAsync(photoId, [existingPersonaId]);
        var result = await manager.AddTaggedPersonasBatchAsync(baulId, [photoId], [newPersonaId]);

        Assert.True(result.IsSuccess);
        var tags = await _fixture.PhotoPersonaTags.GetPersonaIdsByPhotoIdAsync(photoId);
        Assert.Contains(existingPersonaId, tags);
        Assert.Contains(newPersonaId, tags);
    }

    [Fact]
    public async Task AddTaggedPersonasBatchAsync_ShouldSkipPhotos_NotBelongingToTheBaul()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuelo Antonio");
        var ownPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "key-1");

        var otherBaulId = await _fixture.CreateBaulAsync("Otro", "someone-else");
        var foreignPhotoId = await _fixture.AddPhotoAsync(otherBaulId, storageKey: "key-2", uploadedBy: "someone-else");

        var manager = CreateManager(CustodioId);
        var result = await manager.AddTaggedPersonasBatchAsync(
            baulId, [ownPhotoId, foreignPhotoId], [personaId]);

        Assert.True(result.IsSuccess);
        Assert.Equal([ownPhotoId.ToString()], result.Value);
        Assert.Empty(await _fixture.PhotoPersonaTags.GetPersonaIdsByPhotoIdAsync(foreignPhotoId));
    }

    [Fact]
    public async Task AddTaggedPersonasBatchAsync_ShouldFail_WhenPersonaBelongsToAnotherBaul()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var otherBaulId = await _fixture.CreateBaulAsync("Otro", "someone-else");
        var foreignPersonaId = await _fixture.AddPendingPersonaAsync(otherBaulId, "Ajeno");

        var manager = CreateManager(CustodioId);
        var result = await manager.AddTaggedPersonasBatchAsync(baulId, [photoId], [foreignPersonaId]);

        Assert.True(result.IsFailure);
        Assert.Equal("Persona not found", result.Error.Message);
        Assert.Empty(await _fixture.PhotoPersonaTags.GetPersonaIdsByPhotoIdAsync(photoId));
    }

    [Fact]
    public async Task AddTaggedPersonasBatchAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var manager = CreateManager("someone-else");
        var result = await manager.AddTaggedPersonasBatchAsync(baulId, [photoId], []);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }
}
