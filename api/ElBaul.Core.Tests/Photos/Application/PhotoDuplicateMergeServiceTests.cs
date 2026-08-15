using ElBaul.Core.Photos.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Tests.Fixtures;

using ElBaul.Domain;
namespace ElBaul.Tests.Application.Photos;

public class PhotoDuplicateMergeServiceTests
{
    private readonly BaulFixture _fixture = new();
    private readonly InMemorySharedLinkRepository _sharedLinks = new();

    private PhotoDuplicateMergeService CreateService() =>
        new(_fixture.Photos, _fixture.Chapters, _fixture.Baules, _fixture.Personas, _fixture.Recuerdos, _fixture.PhotoPersonaTags,
            _sharedLinks, new PhotoLifecycleService(_fixture.Photos, _fixture.ChapterPhotoCountListener, _fixture.BaulPhotoCoverListener, _fixture.Clock),
            new FakeUnitOfWork(), _fixture.Clock);

    private static PhotoDate Date(int year, int? month = null, int? day = null) =>
        PhotoDate.Parse(year, month, day).Value;

    [Fact]
    public void SelectSurvivor_PicksTheOldestPhotoDate_RegardlessOfChapterOrCreatedAt()
    {
        var a = Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(Guid.NewGuid()), new BaulId(Guid.NewGuid()),
            "a", Date(1998, 5, 1), new UserId("u"), new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        var b = Photo.Create(new PhotoId(Guid.NewGuid()), null, a.BaulId,
            "b", Date(1997, 6, 1), new UserId("u"), new DateTime(2019, 1, 1, 0, 0, 0, DateTimeKind.Utc));

        var survivor = PhotoDuplicateMergeService.SelectSurvivor([a, b]);

        Assert.Equal(b.Id, survivor.Id);
    }

    [Fact]
    public void SelectSurvivor_TreatsAnUndatedPhoto_AsOlderThanNothing_ButYoungerThanAnyDatedOne()
    {
        var dated = Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()),
            "dated", Date(1997), new UserId("u"), DateTime.UtcNow);
        var undated = Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(Guid.NewGuid()), dated.BaulId,
            "undated", null, new UserId("u"), DateTime.UtcNow);

        var survivor = PhotoDuplicateMergeService.SelectSurvivor([dated, undated]);

        // The oldest known date wins, even against a classified/no-date photo.
        Assert.Equal(dated.Id, survivor.Id);
    }

    [Fact]
    public void SelectSurvivor_BreaksATiedPhotoDate_WithTheOldestCreatedAt()
    {
        var sameDate = Date(2000, 1, 1);
        var older = Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()),
            "older", sameDate, new UserId("u"), new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        var newer = Photo.Create(new PhotoId(Guid.NewGuid()), null, older.BaulId,
            "newer", sameDate, new UserId("u"), new DateTime(2021, 1, 1, 0, 0, 0, DateTimeKind.Utc));

        var survivor = PhotoDuplicateMergeService.SelectSurvivor([newer, older]);

        Assert.Equal(older.Id, survivor.Id);
    }

    [Fact]
    public void SelectSurvivor_BreaksATiedDateAndCreatedAt_WithThePhotoId_Deterministically()
    {
        var sameDate = Date(2000, 1, 1);
        var sameCreatedAt = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var baulId = new BaulId(Guid.NewGuid());
        var lowerId = new PhotoId(Guid.Parse("00000000-0000-0000-0000-000000000001"));
        var higherId = new PhotoId(Guid.Parse("00000000-0000-0000-0000-000000000002"));
        var a = Photo.Create(higherId, null, baulId, "a", sameDate, new UserId("u"), sameCreatedAt);
        var b = Photo.Create(lowerId, null, baulId, "b", sameDate, new UserId("u"), sameCreatedAt);

        var survivorAB = PhotoDuplicateMergeService.SelectSurvivor([a, b]);
        var survivorBA = PhotoDuplicateMergeService.SelectSurvivor([b, a]);

        Assert.Equal(lowerId, survivorAB.Id);
        // Result must not depend on iteration order.
        Assert.Equal(survivorAB.Id, survivorBA.Id);
    }

    [Fact]
    public async Task MergeGroupAsync_KeepsTheMinimumPhotoDateAcrossTheWholeGroup()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var a = await _fixture.AddPhotoAsync(baulId, storageKey: "a", date: Date(2020), originalContentHash: "hash");
        var b = await _fixture.AddPhotoAsync(baulId, storageKey: "b", date: Date(1987), originalContentHash: "hash");
        var c = await _fixture.AddPhotoAsync(baulId, storageKey: "c", date: Date(2015), originalContentHash: "hash");
        var group = new[] { a, b, c }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();

        var result = await CreateService().MergeGroupAsync(group);

        Assert.Equal(1987, result.Survivor.Date!.Year);
        var reloaded = await _fixture.Photos.GetByIdAsync(result.Survivor.Id);
        Assert.Equal(1987, reloaded!.Date!.Year);
    }

    [Fact]
    public async Task MergeGroupAsync_KeepsTheSurvivorsChapter_NeverAdoptingADuplicatesChapter()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var chapterA = await _fixture.AddChapterAsync(baulId, "A");
        var chapterB = await _fixture.AddChapterAsync(baulId, "B");
        // Survivor is the one with the older date — put it in chapter A, the duplicate in B.
        var survivorId = await _fixture.AddPhotoAsync(baulId, chapterA, "survivor", Date(1997), originalContentHash: "hash");
        var duplicateId = await _fixture.AddPhotoAsync(baulId, chapterB, "duplicate", Date(2020), originalContentHash: "hash");
        var group = new[] { survivorId, duplicateId }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();

        var result = await CreateService().MergeGroupAsync(group);

        Assert.Equal(survivorId, result.Survivor.Id);
        var reloaded = await _fixture.Photos.GetByIdAsync(survivorId);
        Assert.Equal(chapterA, reloaded!.ChapterId);
    }

    [Fact]
    public async Task MergeGroupAsync_LeavesTheSurvivorWithoutAChapter_WhenItHadNoneEvenIfADuplicateDid()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var chapterB = await _fixture.AddChapterAsync(baulId, "B");
        var survivorId = await _fixture.AddPhotoAsync(baulId, null, "survivor", Date(1997), originalContentHash: "hash");
        var duplicateId = await _fixture.AddPhotoAsync(baulId, chapterB, "duplicate", Date(2020), originalContentHash: "hash");
        var group = new[] { survivorId, duplicateId }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();

        var result = await CreateService().MergeGroupAsync(group);

        var reloaded = await _fixture.Photos.GetByIdAsync(survivorId);
        Assert.Null(reloaded!.ChapterId);
    }

    [Fact]
    public async Task MergeGroupAsync_TransfersAllMemories_FromEveryDuplicateOntoTheSurvivor()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var a = await _fixture.AddPhotoAsync(baulId, storageKey: "a", date: Date(2020), originalContentHash: "hash");
        var b = await _fixture.AddPhotoAsync(baulId, storageKey: "b", date: Date(1987), originalContentHash: "hash");
        var c = await _fixture.AddPhotoAsync(baulId, storageKey: "c", date: Date(2015), originalContentHash: "hash");
        var memory1 = new Recuerdo(new RecuerdoId(Guid.NewGuid()), a, null, baulId, new UserId("u1"), "Memory 1", DateTime.UtcNow);
        var memory2 = new Recuerdo(new RecuerdoId(Guid.NewGuid()), a, null, baulId, new UserId("u1"), "Memory 2", DateTime.UtcNow);
        var memory3 = new Recuerdo(new RecuerdoId(Guid.NewGuid()), b, null, baulId, new UserId("u2"), "Memory 3", DateTime.UtcNow);
        var memory4 = new Recuerdo(new RecuerdoId(Guid.NewGuid()), c, null, baulId, new UserId("u3"), "Memory 4", DateTime.UtcNow);
        foreach (var memory in new[] { memory1, memory2, memory3, memory4 })
            await _fixture.Recuerdos.CreateAsync(memory);
        var group = new[] { a, b, c }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();

        // b is the survivor (oldest date, 1987).
        var result = await CreateService().MergeGroupAsync(group);

        var survivorMemories = (await _fixture.Recuerdos.GetByPhotoIdAsync(result.Survivor.Id)).ToList();
        Assert.Equal(4, survivorMemories.Count);
        Assert.Equal(new[] { "Memory 1", "Memory 2", "Memory 3", "Memory 4" }, survivorMemories.Select(m => m.Text).OrderBy(t => t));
        // Authorship/timestamps are preserved, not rewritten.
        Assert.Contains(survivorMemories, m => m.Text == "Memory 1" && m.UserId == new UserId("u1"));
    }

    [Fact]
    public async Task MergeGroupAsync_UnionsTaggedPeople_WithoutDuplicatePersonaPhotoTagRows()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var pedro = await _fixture.AddColaboradorAsync(baulId, "pedro", "Pedro");
        var maria = await _fixture.AddColaboradorAsync(baulId, "maria", "Maria");
        var antonio = await _fixture.AddColaboradorAsync(baulId, "antonio", "Antonio");
        var a = await _fixture.AddPhotoAsync(baulId, storageKey: "a", date: Date(2020), originalContentHash: "hash");
        var b = await _fixture.AddPhotoAsync(baulId, storageKey: "b", date: Date(1987), originalContentHash: "hash");
        await _fixture.PhotoPersonaTags.SetTagsAsync(a, baulId, [pedro, maria], DateTime.UtcNow);
        await _fixture.PhotoPersonaTags.SetTagsAsync(b, baulId, [maria, antonio], DateTime.UtcNow);
        var group = new[] { a, b }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();

        var result = await CreateService().MergeGroupAsync(group);

        var survivorTags = (await _fixture.PhotoPersonaTags.GetPersonaIdsByPhotoIdAsync(result.Survivor.Id)).ToList();
        Assert.Equal(3, survivorTags.Count);
        Assert.Contains(pedro, survivorTags);
        Assert.Contains(maria, survivorTags);
        Assert.Contains(antonio, survivorTags);
    }

    [Fact]
    public async Task MergeGroupAsync_RedirectsTheBaulCover_WhenADuplicateWasTheCover()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var survivorId = await _fixture.AddPhotoAsync(baulId, storageKey: "survivor-key", date: Date(1990), originalContentHash: "hash");
        var duplicateId = await _fixture.AddPhotoAsync(baulId, storageKey: "duplicate-key", date: Date(2020), originalContentHash: "hash");
        var baul = (await _fixture.Baules.GetByIdAsync(baulId))!;
        await _fixture.Baules.UpdateAsync(baul with { CoverPhotoId = duplicateId });
        var group = new[] { survivorId, duplicateId }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();

        await CreateService().MergeGroupAsync(group);

        var reloadedBaul = await _fixture.Baules.GetByIdAsync(baulId);
        Assert.Equal(survivorId, reloadedBaul!.CoverPhotoId);
    }

    [Fact]
    public async Task MergeGroupAsync_RedirectsTheChapterCover_WhenADuplicateWasTheCover()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var chapterId = await _fixture.AddChapterAsync(baulId);
        var survivorId = await _fixture.AddPhotoAsync(baulId, chapterId, "survivor-key", Date(1990), originalContentHash: "hash");
        var duplicateId = await _fixture.AddPhotoAsync(baulId, chapterId, "duplicate-key", Date(2020), originalContentHash: "hash");
        await _fixture.Chapters.UpdateAsync((await _fixture.Chapters.GetByIdAsync(chapterId))! with { CoverPhotoId = duplicateId });
        var group = new[] { survivorId, duplicateId }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();

        await CreateService().MergeGroupAsync(group);

        var reloadedChapter = await _fixture.Chapters.GetByIdAsync(chapterId);
        Assert.Equal(survivorId, reloadedChapter!.CoverPhotoId);
    }

    [Fact]
    public async Task MergeGroupAsync_RedirectsAPersonaAvatar_WhenADuplicateWasTheAvatarPhoto()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var survivorId = await _fixture.AddPhotoAsync(baulId, storageKey: "survivor-key", date: Date(1990), originalContentHash: "hash");
        var duplicateId = await _fixture.AddPhotoAsync(baulId, storageKey: "duplicate-key", date: Date(2020), originalContentHash: "hash");
        var personaId = await _fixture.AddColaboradorAsync(baulId, "u1", "Pedro");
        var persona = (await _fixture.Personas.GetPersonaByIdAsync(personaId))!;
        await _fixture.Personas.UpdatePersonaAsync(persona.WithAvatarPhotoId(duplicateId));
        var group = new[] { survivorId, duplicateId }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();

        await CreateService().MergeGroupAsync(group);

        var reloadedPersona = await _fixture.Personas.GetPersonaByIdAsync(personaId);
        Assert.Equal(survivorId, reloadedPersona!.AvatarPhotoId);
    }

    [Fact]
    public async Task MergeGroupAsync_RedirectsASharedLink_WhenItPointedAtADuplicate()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var survivorId = await _fixture.AddPhotoAsync(baulId, storageKey: "survivor-key", date: Date(1990), originalContentHash: "hash");
        var duplicateId = await _fixture.AddPhotoAsync(baulId, storageKey: "duplicate-key", date: Date(2020), originalContentHash: "hash");
        var sharedLink = new ElBaul.Core.Sharing.OutputPorts.SharedLink(
            new SharedLinkId(Guid.NewGuid()), "token-1", baulId, ElBaul.Core.Sharing.OutputPorts.SharedLinkContentType.Photo,
            duplicateId, null, new UserId("u1"), DateTime.UtcNow);
        await _sharedLinks.CreateAsync(sharedLink);
        var group = new[] { survivorId, duplicateId }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();

        await CreateService().MergeGroupAsync(group);

        var reloadedLink = await _sharedLinks.GetByTokenAsync("token-1");
        Assert.Equal(survivorId, reloadedLink!.PhotoId);
    }

    [Fact]
    public async Task MergeGroupAsync_SoftDeletesEveryDuplicate_WithTheFlaggedAsDuplicateReason_AndKeepsItsStorageKey()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var survivorId = await _fixture.AddPhotoAsync(baulId, storageKey: "survivor-key", date: Date(1990), originalContentHash: "hash");
        var duplicateId = await _fixture.AddPhotoAsync(baulId, storageKey: "duplicate-key", date: Date(2020), originalContentHash: "hash");
        var group = new[] { survivorId, duplicateId }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();

        var result = await CreateService().MergeGroupAsync(group);

        Assert.Equal([duplicateId], result.Duplicates.Select(d => d.Id));
        var reloadedDuplicate = await _fixture.Photos.GetByIdAsync(duplicateId);
        Assert.Equal(PhotoStatus.Deleted, reloadedDuplicate!.Status);
        Assert.Equal(PhotoDeletionReasons.FlaggedAsDuplicate, reloadedDuplicate.DeletionReason);
        // The duplicate's blob is never touched or reassigned.
        Assert.Equal("duplicate-key", reloadedDuplicate.StorageKey);
        var reloadedSurvivor = await _fixture.Photos.GetByIdAsync(survivorId);
        Assert.Equal(PhotoStatus.Active, reloadedSurvivor!.Status);
    }

    [Fact]
    public async Task MergeGroupAsync_KeepsTheSurvivorsUploadedByAndCreatedAt()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var survivorCreatedAt = new DateTime(2018, 3, 1, 0, 0, 0, DateTimeKind.Utc);
        var survivorId = await _fixture.AddPhotoAsync(
            baulId, storageKey: "survivor-key", date: Date(1990), uploadedBy: "survivor-uploader",
            createdAt: survivorCreatedAt, originalContentHash: "hash");
        var duplicateId = await _fixture.AddPhotoAsync(
            baulId, storageKey: "duplicate-key", date: Date(2020), uploadedBy: "duplicate-uploader", originalContentHash: "hash");
        var group = new[] { survivorId, duplicateId }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();

        var result = await CreateService().MergeGroupAsync(group);

        Assert.Equal(new UserId("survivor-uploader"), result.Survivor.UploadedBy);
        Assert.Equal(survivorCreatedAt, result.Survivor.CreatedAt);
    }

    [Fact]
    public async Task MergeGroupAsync_HandlesAGroupOfThreeOrMoreDuplicates_IndependentlyOfProcessingOrder()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var a = await _fixture.AddPhotoAsync(baulId, storageKey: "a", date: Date(2020), originalContentHash: "hash");
        var b = await _fixture.AddPhotoAsync(baulId, storageKey: "b", date: Date(1987), originalContentHash: "hash");
        var c = await _fixture.AddPhotoAsync(baulId, storageKey: "c", date: Date(2015), originalContentHash: "hash");
        var d = await _fixture.AddPhotoAsync(baulId, storageKey: "d", date: Date(2001), originalContentHash: "hash");
        var forwardGroup = new[] { a, b, c, d }.Select(id => _fixture.Photos.GetByIdAsync(id).Result!).ToList();
        var reversedGroup = forwardGroup.AsEnumerable().Reverse().ToList();

        var forwardSurvivor = PhotoDuplicateMergeService.SelectSurvivor(forwardGroup);
        var reversedSurvivor = PhotoDuplicateMergeService.SelectSurvivor(reversedGroup);

        Assert.Equal(b, forwardSurvivor.Id);
        Assert.Equal(forwardSurvivor.Id, reversedSurvivor.Id);
    }
}
