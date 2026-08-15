using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

public class BackfillBaulChapterCoverPhotoIdCommandTests
{
    private readonly InMemoryPersonaRepository _personas = new();
    private readonly InMemoryBaulRepository _baules;
    private readonly InMemoryChapterRepository _chapters = new();
    private readonly InMemoryPhotoRepository _photos = new();

    public BackfillBaulChapterCoverPhotoIdCommandTests()
    {
        _baules = new InMemoryBaulRepository(_personas);
    }

    private BackfillBaulChapterCoverPhotoIdCommand CreateCommand() =>
        new(_baules, _chapters, _photos, NullLogger<BackfillBaulChapterCoverPhotoIdCommand>.Instance);

    private async Task<BaulId> SeedBaulAsync(string? coverPhotoKey)
    {
        var baulId = new BaulId(Guid.NewGuid());
        await _baules.CreateAsync(new Baul(
            baulId, "Familia", null, new UserId("custodio-1"), 0, DateTime.UtcNow, DateTime.UtcNow, CoverPhotoKey: coverPhotoKey));
        return baulId;
    }

    private async Task<Photo> SeedActivePhotoAsync(BaulId baulId, string storageKey) =>
        await CreateAndStoreAsync(baulId, storageKey);

    private async Task<Photo> CreateAndStoreAsync(BaulId baulId, string storageKey)
    {
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, storageKey, null, new UserId("custodio-1"), DateTime.UtcNow);
        await _photos.CreateAsync(photo);
        return photo;
    }

    [Fact]
    public async Task RunAsync_SetsCoverPhotoId_WhenAnActivePhotoMatchesTheLegacyKey()
    {
        var baulId = await SeedBaulAsync("cover-key");
        var photo = await SeedActivePhotoAsync(baulId, "cover-key");

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var baul = await _baules.GetByIdAsync(baulId);
        Assert.Equal(photo.Id, baul!.CoverPhotoId);
        // The legacy key itself is left untouched — the command is a read-only consumer of it.
        Assert.Equal("cover-key", baul.CoverPhotoKey);
    }

    [Fact]
    public async Task RunAsync_SetsChapterCoverPhotoId_WhenAnActivePhotoMatchesTheLegacyKey()
    {
        var baulId = await SeedBaulAsync(coverPhotoKey: null);
        var chapterId = new ChapterId(Guid.NewGuid());
        await _chapters.CreateAsync(new Chapter(chapterId, baulId, "Chapter", 1, "chapter-cover-key", DateTime.UtcNow, DateTime.UtcNow));
        var photo = await SeedActivePhotoAsync(baulId, "chapter-cover-key");

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var chapter = await _chapters.GetByIdAsync(chapterId);
        Assert.Equal(photo.Id, chapter!.CoverPhotoId);
    }

    [Fact]
    public async Task RunAsync_WithDryRun_DoesNotPersistTheResolvedCoverPhotoId()
    {
        var baulId = await SeedBaulAsync("cover-key");
        await SeedActivePhotoAsync(baulId, "cover-key");

        var exitCode = await CreateCommand().RunAsync(dryRun: true);

        Assert.Equal(0, exitCode);
        var baul = await _baules.GetByIdAsync(baulId);
        Assert.Null(baul!.CoverPhotoId);
    }

    [Fact]
    public async Task RunAsync_LeavesCoverPhotoIdNull_WhenNoActivePhotoMatchesTheLegacyKey()
    {
        var baulId = await SeedBaulAsync("gone-key");

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var baul = await _baules.GetByIdAsync(baulId);
        Assert.Null(baul!.CoverPhotoId);
    }

    [Fact]
    public async Task RunAsync_SkipsBaules_ThatAlreadyHaveACoverPhotoId()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var alreadyResolvedPhotoId = new PhotoId(Guid.NewGuid());
        await _baules.CreateAsync(new Baul(
            baulId, "Familia", null, new UserId("custodio-1"), 0, DateTime.UtcNow, DateTime.UtcNow,
            CoverPhotoKey: "cover-key", CoverPhotoId: alreadyResolvedPhotoId));
        await SeedActivePhotoAsync(baulId, "cover-key");

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var baul = await _baules.GetByIdAsync(baulId);
        Assert.Equal(alreadyResolvedPhotoId, baul!.CoverPhotoId);
    }

    [Fact]
    public async Task RunAsync_IsIdempotent_ASecondRunChangesNothing()
    {
        var baulId = await SeedBaulAsync("cover-key");
        var photo = await SeedActivePhotoAsync(baulId, "cover-key");
        var command = CreateCommand();
        await command.RunAsync(dryRun: false);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var baul = await _baules.GetByIdAsync(baulId);
        Assert.Equal(photo.Id, baul!.CoverPhotoId);
    }
}
