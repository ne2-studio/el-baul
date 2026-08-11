using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

public class BackfillRecuerdoBaulIdCommandTests
{
    [Fact]
    public async Task RunAsync_WithDryRun_ResolvesFromPhotoWithoutWriting()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var photoId = new PhotoId(Guid.NewGuid());
        var recuerdoRepository = new InMemoryRecuerdoRepository();
        var photoRepository = new InMemoryPhotoRepository();
        await photoRepository.CreateAsync(Photo.Create(photoId, null, baulId, "photos/one.jpg", null, new UserId("user-1"), DateTime.UtcNow));
        var recuerdo = await CreateCandidateAsync(recuerdoRepository, photoId, null);

        var command = new BackfillRecuerdoBaulIdCommand(
            recuerdoRepository, photoRepository, new InMemoryChapterRepository(),
            NullLogger<BackfillRecuerdoBaulIdCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: true);

        var stored = (await recuerdoRepository.GetAllAsync()).Single(r => r.Id == recuerdo.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(Guid.Empty, stored.BaulId.Value);
    }

    [Fact]
    public async Task RunAsync_SetsBaulIdResolvedFromChapterWhenNotDryRun()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var chapterId = new ChapterId(Guid.NewGuid());
        var recuerdoRepository = new InMemoryRecuerdoRepository();
        var chapterRepository = new InMemoryChapterRepository();
        await chapterRepository.CreateAsync(
            new Chapter(chapterId, baulId, "Verano", 0, null, DateTime.UtcNow, DateTime.UtcNow));
        var recuerdo = await CreateCandidateAsync(recuerdoRepository, null, chapterId);

        var command = new BackfillRecuerdoBaulIdCommand(
            recuerdoRepository, new InMemoryPhotoRepository(), chapterRepository,
            NullLogger<BackfillRecuerdoBaulIdCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = (await recuerdoRepository.GetAllAsync()).Single(r => r.Id == recuerdo.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(baulId, stored.BaulId);
    }

    [Fact]
    public async Task RunAsync_LeavesUnresolvableCandidatesWithoutFailing()
    {
        var recuerdoRepository = new InMemoryRecuerdoRepository();
        var recuerdo = await CreateCandidateAsync(recuerdoRepository, new PhotoId(Guid.NewGuid()), null);

        var command = new BackfillRecuerdoBaulIdCommand(
            recuerdoRepository, new InMemoryPhotoRepository(), new InMemoryChapterRepository(),
            NullLogger<BackfillRecuerdoBaulIdCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = (await recuerdoRepository.GetAllAsync()).Single(r => r.Id == recuerdo.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(Guid.Empty, stored.BaulId.Value);
    }

    [Fact]
    public async Task RunAsync_ReturnsFailureWhenARepositoryLookupFails()
    {
        var recuerdoRepository = new InMemoryRecuerdoRepository();
        var recuerdo = await CreateCandidateAsync(recuerdoRepository, new PhotoId(Guid.NewGuid()), null);

        var command = new BackfillRecuerdoBaulIdCommand(
            recuerdoRepository, new FailingPhotoRepository(), new InMemoryChapterRepository(),
            NullLogger<BackfillRecuerdoBaulIdCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = (await recuerdoRepository.GetAllAsync()).Single(r => r.Id == recuerdo.Id);
        Assert.Equal(1, exitCode);
        Assert.Equal(Guid.Empty, stored.BaulId.Value);
    }

    private static async Task<Recuerdo> CreateCandidateAsync(
        InMemoryRecuerdoRepository repository,
        PhotoId? photoId,
        ChapterId? chapterId)
    {
        var recuerdo = new Recuerdo(
            new RecuerdoId(Guid.NewGuid()), photoId, chapterId, default, new UserId("user-1"), "Texto", DateTime.UtcNow);
        await repository.CreateAsync(recuerdo);
        return recuerdo;
    }
}
