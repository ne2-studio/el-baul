using ElBaul.Application.Bauls;
using ElBaul.Application.Photos;
using ElBaul.Application.Sharing;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Sharing;
using ElBaul.OutputPorts.Users;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class RemovalRequestManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string OtherUserId = "user-2";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryUserRepository _userRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    public RemovalRequestManagerTests()
    {
        _userRepository.Seed(new User(new UserId(CustodioId), "custodio@test.com", "Custodio", _clock.UtcNow()));
        _userRepository.Seed(new User(new UserId(OtherUserId), "other@test.com", "Other", _clock.UtcNow()));
    }

    private RemovalRequestManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<RemovalRequestManager>.Instance, _baulRepository, _photoRepository,
            _userRepository, _photoStorage, new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance),
            new PhotoLifecycleService(_photoRepository, _chapterRepository, _baulRepository, _clock), new FakeUnitOfWork());

    // Custodians now have a real Personas row (created by BaulManager.CreateAsync);
    // tests that seed the Baul directly via the repository need to add it themselves.
    private async Task<Baul> SeedBaulAsync(
        Guid baulId, string name, string? description = null, string custodioId = CustodioId,
        DateTime? createdAt = null, DateTime? updatedAt = null)
    {
        var created = createdAt ?? _clock.UtcNow();
        var baul = new Baul(new BaulId(baulId), name, description, new UserId(custodioId), 0, created, updatedAt ?? created);
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(custodioId), "Custodio", BaulRole.Administrador, created));
        return baul;
    }

    [Fact]
    public async Task CreateRemovalRequestAsync_ShouldUsePersonaNickname_ForTheRequesterName()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, "key", _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, new UserId(CustodioId), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(OtherUserId), "Tita Solicitudes", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.CreateRemovalRequestAsync(new BaulId(baulId), new PhotoId(photoId), "no me gusta");

        Assert.True(result.IsSuccess);
        Assert.Equal("Tita Solicitudes", result.Value.RequesterName);
    }

    [Fact]
    public async Task CreateRemovalRequestAsync_ShouldDenyAccess_WhenCallerHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, "key", _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, new UserId(CustodioId), _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.CreateRemovalRequestAsync(new BaulId(baulId), new PhotoId(photoId), "no me gusta");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task CreateRemovalRequestAsync_ShouldRejectPhotoFromAnotherBaul()
    {
        var firstBaulId = Guid.NewGuid();
        var secondBaulId = Guid.NewGuid();
        var secondChapterId = Guid.NewGuid();
        var secondPhotoId = Guid.NewGuid();
        await SeedBaulAsync(firstBaulId, "Familia primera");
        await SeedBaulAsync(secondBaulId, "Familia segunda", custodioId: OtherUserId);
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(secondChapterId), new BaulId(secondBaulId), "Chapter", 1, "key", _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(secondPhotoId), new ChapterId(secondChapterId), new BaulId(secondBaulId), "key", null, new UserId(OtherUserId), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRemovalRequestAsync(
            new BaulId(firstBaulId), new PhotoId(secondPhotoId), "cross-baul");

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);
        Assert.Empty(await _baulRepository.GetRemovalRequestsAsync(new BaulId(firstBaulId)));
    }

    [Fact]
    public async Task ApproveRemovalRequestAsync_ShouldSoftDeletePhoto_AndDecrementChapterPhotoCount()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();

        await SeedBaulAsync(baulId, "Familia");
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, "key", _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, new UserId(CustodioId), _clock.UtcNow()));

        var requestId = Guid.NewGuid();
        await _baulRepository.CreateRemovalRequestAsync(new RemovalRequest(new RemovalRequestId(requestId), new BaulId(baulId), new PhotoId(photoId), "key", "Requester", "req@test.com", "Retirar por privacidad", _clock.UtcNow(), RequestStatus.Pending));

        var manager = CreateManager(CustodioId);
        var result = await manager.ApproveRemovalRequestAsync(new BaulId(baulId), new RemovalRequestId(requestId));

        Assert.True(result.IsSuccess);

        var deletedPhoto = await _photoRepository.GetByIdAsync(new PhotoId(photoId));
        Assert.NotNull(deletedPhoto);
        Assert.Equal(PhotoStatus.Deleted, deletedPhoto.Status);
        Assert.Equal("key", deletedPhoto.StorageKey);
        Assert.Equal(_clock.UtcNow(), deletedPhoto.DeletedAt);
        Assert.Equal("Retirar por privacidad", deletedPhoto.DeletionReason);
        Assert.Empty(_photoStorage.DeletedKeys);
        Assert.Null(await _baulRepository.GetRemovalRequestAsync(new BaulId(baulId), new RemovalRequestId(requestId)));

        var chapter = await _chapterRepository.GetByIdAsync(new ChapterId(chapterId));
        Assert.Equal(0, chapter!.PhotoCount);
    }

    [Fact]
    public async Task RejectRemovalRequestAsync_ShouldKeepPhoto_AndClearTheRequest()
    {
        var baulId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");

        var requestId = Guid.NewGuid();
        await _baulRepository.CreateRemovalRequestAsync(new RemovalRequest(new RemovalRequestId(requestId), new BaulId(baulId), new PhotoId(photoId), "key", "Requester", "req@test.com", null, _clock.UtcNow(), RequestStatus.Pending));

        var manager = CreateManager(CustodioId);
        var result = await manager.RejectRemovalRequestAsync(new BaulId(baulId), new RemovalRequestId(requestId));

        Assert.True(result.IsSuccess);
        Assert.Null(await _baulRepository.GetRemovalRequestAsync(new BaulId(baulId), new RemovalRequestId(requestId)));
    }

    [Fact]
    public async Task RejectRemovalRequestAsync_ShouldReturnNotFound_WhenRequestDoesNotExist()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(CustodioId);
        var result = await manager.RejectRemovalRequestAsync(new BaulId(baulId), new RemovalRequestId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
        Assert.Equal("Request not found", result.Error.Message);
    }
}
