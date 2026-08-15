using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using ElBaul.Core.Photos.OutputPorts;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

public class BackfillUploadBatchIdCommandTests
{
    private static readonly BaulId BaulId = new(Guid.NewGuid());
    private static readonly ChapterId ChapterId = new(Guid.NewGuid());
    private static readonly DateTime Base = new(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task RunAsync_WithDryRun_LeavesPhotosUntouched()
    {
        var repository = new InMemoryPhotoRepository();
        var photo = await CreatePhotoAsync(repository, Base);

        var command = new BackfillUploadBatchIdCommand(repository, NullLogger<BackfillUploadBatchIdCommand>.Instance);
        var exitCode = await command.RunAsync(dryRun: true);

        var stored = await repository.GetByIdAsync(photo.Id);
        Assert.Equal(0, exitCode);
        Assert.Null(stored!.UploadBatchId);
    }

    [Fact]
    public async Task RunAsync_GroupsConsecutiveUploads_BySameUploaderChapterAndCloseTiming()
    {
        var repository = new InMemoryPhotoRepository();
        var first = await CreatePhotoAsync(repository, Base);
        var second = await CreatePhotoAsync(repository, Base.AddMinutes(2));

        var command = new BackfillUploadBatchIdCommand(repository, NullLogger<BackfillUploadBatchIdCommand>.Instance);
        await command.RunAsync(dryRun: false);

        var storedFirst = await repository.GetByIdAsync(first.Id);
        var storedSecond = await repository.GetByIdAsync(second.Id);
        Assert.NotNull(storedFirst!.UploadBatchId);
        Assert.Equal(storedFirst.UploadBatchId, storedSecond!.UploadBatchId);
    }

    [Fact]
    public async Task RunAsync_StartsANewBatch_WhenGapExceedsFiveMinutes()
    {
        var repository = new InMemoryPhotoRepository();
        var first = await CreatePhotoAsync(repository, Base);
        var second = await CreatePhotoAsync(repository, Base.AddMinutes(10));

        var command = new BackfillUploadBatchIdCommand(repository, NullLogger<BackfillUploadBatchIdCommand>.Instance);
        await command.RunAsync(dryRun: false);

        var storedFirst = await repository.GetByIdAsync(first.Id);
        var storedSecond = await repository.GetByIdAsync(second.Id);
        Assert.NotEqual(storedFirst!.UploadBatchId, storedSecond!.UploadBatchId);
    }

    [Fact]
    public async Task RunAsync_StartsANewBatch_WhenUploaderDiffers()
    {
        var repository = new InMemoryPhotoRepository();
        var first = await CreatePhotoAsync(repository, Base, uploadedBy: "user-1");
        var second = await CreatePhotoAsync(repository, Base.AddSeconds(1), uploadedBy: "user-2");

        var command = new BackfillUploadBatchIdCommand(repository, NullLogger<BackfillUploadBatchIdCommand>.Instance);
        await command.RunAsync(dryRun: false);

        var storedFirst = await repository.GetByIdAsync(first.Id);
        var storedSecond = await repository.GetByIdAsync(second.Id);
        Assert.NotEqual(storedFirst!.UploadBatchId, storedSecond!.UploadBatchId);
    }

    [Fact]
    public async Task RunAsync_SkipsPhotos_ThatAlreadyHaveAnUploadBatchId()
    {
        var repository = new InMemoryPhotoRepository();
        var existingBatchId = Guid.NewGuid();
        var alreadyBatched = Photo.Create(
            new PhotoId(Guid.NewGuid()), ChapterId, BaulId, "key", null, new UserId("user-1"), Base, uploadBatchId: existingBatchId);
        await repository.CreateAsync(alreadyBatched);

        var command = new BackfillUploadBatchIdCommand(repository, NullLogger<BackfillUploadBatchIdCommand>.Instance);
        await command.RunAsync(dryRun: false);

        var stored = await repository.GetByIdAsync(alreadyBatched.Id);
        Assert.Equal(existingBatchId, stored!.UploadBatchId);
    }

    [Fact]
    public async Task RunAsync_IsIdempotent_ReRunningLeavesAlreadyBackfilledPhotosUnchanged()
    {
        var repository = new InMemoryPhotoRepository();
        var photo = await CreatePhotoAsync(repository, Base);
        var command = new BackfillUploadBatchIdCommand(repository, NullLogger<BackfillUploadBatchIdCommand>.Instance);
        await command.RunAsync(dryRun: false);
        var firstRunBatchId = (await repository.GetByIdAsync(photo.Id))!.UploadBatchId;

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await repository.GetByIdAsync(photo.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(firstRunBatchId, stored!.UploadBatchId);
    }

    private static async Task<Photo> CreatePhotoAsync(
        InMemoryPhotoRepository repository, DateTime createdAt, string uploadedBy = "user-1")
    {
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), ChapterId, BaulId, "key", null, new UserId(uploadedBy), createdAt);
        await repository.CreateAsync(photo);
        return photo;
    }
}
