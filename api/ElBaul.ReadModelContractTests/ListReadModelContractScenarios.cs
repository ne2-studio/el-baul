using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Chapters.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;

using ElBaul.Domain;
namespace ElBaul.ReadModelContractTests;

public interface IListReadModelContractStore
{
    IPhotoListReadModel PhotoLists { get; }
    IChapterListReadModel ChapterLists { get; }
    IRecuerdoListReadModel RecuerdoLists { get; }
    IPhotoUploadBatchReadModel PhotoUploadBatches { get; }

    Task AddBaulAsync(Baul baul);
    Task AddChapterAsync(Chapter chapter);
    Task AddPhotoAsync(Photo photo);
    Task UpdatePhotoAsync(Photo photo);
    Task AddRecuerdoAsync(Recuerdo recuerdo);
    Task AddPersonaAsync(Persona persona);
    Task AddPhotoPersonaTagAsync(PhotoId photoId, PersonaId personaId, BaulId baulId, DateTime createdAt);
}

public static class ListReadModelContractScenarios
{
    private static readonly DateTime T0 = new(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
    private static readonly UserId User = new("contract-user");

    public static async Task Photo_list_filters_orders_and_counts_recuerdos(IListReadModelContractStore store)
    {
        var baulId = B(1);
        var otherBaulId = B(2);
        var chapterId = C(1);
        await SeedBaulAsync(store, baulId);
        await SeedBaulAsync(store, otherBaulId);
        await store.AddChapterAsync(NewChapter(chapterId, baulId, "Verano"));

        var older = NewPhoto(P(1), baulId, chapterId, "older", T0.AddMinutes(30), Date(1990, null, null));
        var newer = NewPhoto(P(2), baulId, chapterId, "newer", T0.AddMinutes(10), Date(1990, 5, 2));
        var undated = NewPhoto(P(3), baulId, chapterId, "undated", T0.AddMinutes(20), null);
        var deleted = NewPhoto(P(4), baulId, chapterId, "deleted", T0, Date(1980, null, null))
            .MarkDeleted("contract", T0.AddHours(1));
        var otherBaul = NewPhoto(P(5), otherBaulId, chapterId: null, "other", T0, null);

        foreach (var photo in new[] { newer, deleted, undated, older, otherBaul })
            await store.AddPhotoAsync(photo);

        await store.AddRecuerdoAsync(NewRecuerdo(R(1), baulId, older.Id, chapterId, "one", T0));
        await store.AddRecuerdoAsync(NewRecuerdo(R(2), baulId, older.Id, chapterId, "two", T0.AddMinutes(1)));
        await store.AddRecuerdoAsync(NewRecuerdo(R(3), baulId, deleted.Id, chapterId, "deleted-photo", T0));

        var rows = await store.PhotoLists.GetPageAsync(baulId, chapterId, skip: 0, take: 10);

        Assert.Equal(new[] { older.Id, newer.Id, undated.Id }, rows.Select(r => r.Id));
        Assert.Equal(2, rows.Single(r => r.Id == older.Id).RecuerdoCount);
        Assert.Equal(0, rows.Single(r => r.Id == newer.Id).RecuerdoCount);
    }

    public static async Task Photo_list_scoped_methods_match_active_rows(IListReadModelContractStore store)
    {
        var baulId = B(10);
        var otherBaulId = B(11);
        var chapterId = C(10);
        await SeedBaulAsync(store, baulId);
        await SeedBaulAsync(store, otherBaulId);
        await store.AddChapterAsync(NewChapter(chapterId, baulId, "Capitulo"));

        var chapterPhoto = NewPhoto(P(10), baulId, chapterId, "chapter", T0, Date(2000, 1, 1));
        var loose = NewPhoto(P(11), baulId, chapterId: null, "loose", T0.AddMinutes(1), null);
        var deletedLoose = NewPhoto(P(12), baulId, chapterId: null, "deleted-loose", T0, null)
            .MarkDeleted("contract", T0.AddHours(1));
        var other = NewPhoto(P(13), otherBaulId, chapterId: null, "other", T0, null);

        foreach (var photo in new[] { chapterPhoto, loose, deletedLoose, other })
            await store.AddPhotoAsync(photo);

        var byChapter = await store.PhotoLists.GetByChapterIdAsync(chapterId);
        var looseRows = await store.PhotoLists.GetLooseByBaulIdAsync(baulId);
        var byIds = await store.PhotoLists.GetActiveByIdsAsync(baulId, new[] { other.Id, deletedLoose.Id, loose.Id, chapterPhoto.Id });

        Assert.Equal(new[] { chapterPhoto.Id }, byChapter.Select(r => r.Id));
        Assert.Equal(new[] { loose.Id }, looseRows.Select(r => r.Id));
        Assert.Equal(new[] { chapterPhoto.Id, loose.Id }, byIds.Select(r => r.Id));
    }

    public static async Task Photo_list_untagged_suggestion_excludes_tagged_confirmed_deleted_and_other_baul(IListReadModelContractStore store)
    {
        var baulId = B(20);
        var otherBaulId = B(21);
        await SeedBaulAsync(store, baulId);
        await SeedBaulAsync(store, otherBaulId);
        var persona = NewPersona(baulId);
        await store.AddPersonaAsync(persona);

        var candidate = NewPhoto(P(20), baulId, chapterId: null, "candidate", T0, null);
        var tagged = NewPhoto(P(21), baulId, chapterId: null, "tagged", T0, null);
        var confirmed = NewPhoto(P(22), baulId, chapterId: null, "confirmed", T0, null).WithConfirmedNoPersonas(true);
        var deleted = NewPhoto(P(23), baulId, chapterId: null, "deleted", T0, null).MarkDeleted("contract", T0);
        var other = NewPhoto(P(24), otherBaulId, chapterId: null, "other", T0, null);

        foreach (var photo in new[] { candidate, tagged, confirmed, deleted, other })
            await store.AddPhotoAsync(photo);
        await store.AddPhotoPersonaTagAsync(tagged.Id, persona.Id, baulId, T0);

        var row = await store.PhotoLists.GetUntaggedSuggestionAsync(baulId);

        Assert.NotNull(row);
        Assert.Equal(candidate.Id, row.Id);
    }

    public static async Task Photo_list_memory_suggestion_excludes_photos_with_a_recuerdo_deleted_and_other_baul(IListReadModelContractStore store)
    {
        var baulId = B(25);
        var otherBaulId = B(26);
        await SeedBaulAsync(store, baulId);
        await SeedBaulAsync(store, otherBaulId);

        var candidate = NewPhoto(P(25), baulId, chapterId: null, "candidate", T0, null);
        var withRecuerdo = NewPhoto(P(26), baulId, chapterId: null, "with-recuerdo", T0, null);
        var deleted = NewPhoto(P(27), baulId, chapterId: null, "deleted", T0, null).MarkDeleted("contract", T0);
        var other = NewPhoto(P(28), otherBaulId, chapterId: null, "other", T0, null);

        foreach (var photo in new[] { candidate, withRecuerdo, deleted, other })
            await store.AddPhotoAsync(photo);
        await store.AddRecuerdoAsync(NewRecuerdo(R(25), baulId, withRecuerdo.Id, chapterId: null, "ya escrito", T0));

        var row = await store.PhotoLists.GetMemorySuggestionAsync(baulId);

        Assert.NotNull(row);
        Assert.Equal(candidate.Id, row.Id);
    }

    public static async Task Chapter_list_aggregates_active_photos_recuerdos_latest_and_date_range(IListReadModelContractStore store)
    {
        var baulId = B(30);
        var otherBaulId = B(31);
        var chapterId = C(30);
        await SeedBaulAsync(store, baulId);
        await SeedBaulAsync(store, otherBaulId);
        await store.AddChapterAsync(NewChapter(chapterId, baulId, "Boda", photoCount: 2));
        await store.AddChapterAsync(NewChapter(C(31), otherBaulId, "Otro"));

        var early = NewPhoto(P(30), baulId, chapterId, "early", T0, Date(1980, null, null));
        var late = NewPhoto(P(31), baulId, chapterId, "late", T0.AddMinutes(1), Date(1990, 2, 3));
        var deleted = NewPhoto(P(32), baulId, chapterId, "deleted", T0, Date(2000, null, null)).MarkDeleted("contract", T0);
        await store.AddPhotoAsync(early);
        await store.AddPhotoAsync(late);
        await store.AddPhotoAsync(deleted);
        await store.AddRecuerdoAsync(NewRecuerdo(R(30), baulId, null, chapterId, "old", T0));
        await store.AddRecuerdoAsync(NewRecuerdo(R(31), baulId, null, chapterId, "latest", T0.AddMinutes(5)));

        var rows = await store.ChapterLists.GetByBaulIdAsync(baulId);

        var row = Assert.Single(rows);
        Assert.Equal(chapterId, row.Id);
        Assert.Equal(2, row.PhotoCount);
        Assert.Equal(2, row.RecuerdoCount);
        Assert.Equal("latest", row.LatestRecuerdoText);
        Assert.Equal(User, row.LatestRecuerdoAuthorUserId);
        Assert.Equal(1980, row.DateRange.MinYear);
        Assert.Equal(1990, row.DateRange.MaxYear);
    }

    public static async Task Recuerdo_list_orders_and_resolves_photo_key_and_chapter_name(IListReadModelContractStore store)
    {
        var baulId = B(40);
        var otherBaulId = B(41);
        var chapterId = C(40);
        await SeedBaulAsync(store, baulId);
        await SeedBaulAsync(store, otherBaulId);
        await store.AddChapterAsync(NewChapter(chapterId, baulId, "Viaje"));
        var photo = NewPhoto(P(40), baulId, chapterId, "photo-key", T0, null);
        await store.AddPhotoAsync(photo);

        var older = NewRecuerdo(R(40), baulId, photo.Id, chapterId, "older", T0);
        var newer = NewRecuerdo(R(41), baulId, null, chapterId, "newer", T0.AddMinutes(1));
        var other = NewRecuerdo(R(42), otherBaulId, null, null, "other", T0.AddMinutes(2));
        await store.AddRecuerdoAsync(older);
        await store.AddRecuerdoAsync(newer);
        await store.AddRecuerdoAsync(other);

        var baulRows = await store.RecuerdoLists.GetByBaulIdAsync(baulId);
        var chapterRows = await store.RecuerdoLists.GetByChapterIdAsync(chapterId);
        var photoRows = await store.RecuerdoLists.GetByPhotoIdAsync(photo.Id);

        Assert.Equal(new[] { newer.Id, older.Id }, baulRows.Select(r => r.Id));
        Assert.Equal(new[] { newer.Id, older.Id }, chapterRows.Select(r => r.Id));
        Assert.Equal(new[] { older.Id }, photoRows.Select(r => r.Id));
        Assert.Equal("photo-key", photoRows[0].PhotoStorageKey);
        Assert.Equal("Viaje", photoRows[0].ChapterName);
    }

    // Regression for #60: a photo-scoped recuerdo's ChapterId is baked in once, at creation
    // time, and never updated afterwards. If the photo is later moved to a different chapter,
    // every listing must resolve the row's chapter *live* from the photo's current chapter —
    // not keep serving the stale ChapterId the recuerdo was created with, which would send the
    // baúl feed's photo click to a chapter the photo is no longer in. A chapter-scoped recuerdo
    // (no photo) has nothing to resolve live from, so it keeps reporting its own ChapterId.
    public static async Task Recuerdo_list_resolves_a_photo_scoped_rows_chapter_live_when_the_photo_later_moves(IListReadModelContractStore store)
    {
        var baulId = B(45);
        var originalChapterId = C(45);
        var newChapterId = C(46);
        await SeedBaulAsync(store, baulId);
        await store.AddChapterAsync(NewChapter(originalChapterId, baulId, "Antiguo"));
        await store.AddChapterAsync(NewChapter(newChapterId, baulId, "Nuevo"));
        var photo = NewPhoto(P(45), baulId, originalChapterId, "photo-key", T0, null);
        await store.AddPhotoAsync(photo);

        var photoRecuerdo = NewRecuerdo(R(45), baulId, photo.Id, originalChapterId, "de la foto", T0);
        var chapterRecuerdo = NewRecuerdo(R(46), baulId, null, originalChapterId, "del capitulo", T0.AddMinutes(1));
        await store.AddRecuerdoAsync(photoRecuerdo);
        await store.AddRecuerdoAsync(chapterRecuerdo);

        await store.UpdatePhotoAsync(photo.InChapter(newChapterId));

        var baulRows = await store.RecuerdoLists.GetByBaulIdAsync(baulId);

        var photoRow = baulRows.Single(r => r.Id == photoRecuerdo.Id);
        Assert.Equal(newChapterId, photoRow.ChapterId);
        Assert.Equal("Nuevo", photoRow.ChapterName);

        var chapterRow = baulRows.Single(r => r.Id == chapterRecuerdo.Id);
        Assert.Equal(originalChapterId, chapterRow.ChapterId);
        Assert.Equal("Antiguo", chapterRow.ChapterName);
    }

    public static async Task Photo_upload_batch_groups_active_photos_and_returns_chronological_batch_photos(IListReadModelContractStore store)
    {
        var baulId = B(50);
        var otherBaulId = B(51);
        var chapterId = C(50);
        var batchId = G(500);
        await SeedBaulAsync(store, baulId);
        await SeedBaulAsync(store, otherBaulId);
        await store.AddChapterAsync(NewChapter(chapterId, baulId, "Cumple"));

        var first = NewPhoto(P(50), baulId, chapterId, "first", T0, null, batchId);
        var second = NewPhoto(P(51), baulId, chapterId, "second", T0.AddMinutes(1), null, batchId);
        var deleted = NewPhoto(P(52), baulId, chapterId, "deleted", T0.AddMinutes(2), null, batchId).MarkDeleted("contract", T0);
        var noBatch = NewPhoto(P(53), baulId, chapterId, "no-batch", T0, null);
        var other = NewPhoto(P(54), otherBaulId, chapterId: null, "other", T0, null, batchId);
        foreach (var photo in new[] { second, deleted, noBatch, first, other })
            await store.AddPhotoAsync(photo);
        await store.AddRecuerdoAsync(NewRecuerdo(R(50), baulId, first.Id, chapterId, "one", T0));

        var batches = await store.PhotoUploadBatches.GetByBaulIdAsync(baulId);
        var photos = await store.PhotoUploadBatches.GetPhotosByBatchIdAsync(baulId, batchId);

        var batch = Assert.Single(batches);
        Assert.Equal(batchId, batch.BatchId);
        Assert.Equal(chapterId, batch.ChapterId);
        Assert.Equal("Cumple", batch.ChapterName);
        Assert.Equal(2, batch.PhotoCount);
        Assert.Equal(new[] { first.Id, second.Id }, batch.PreviewPhotos.Select(p => p.Id));
        Assert.Equal(1, batch.PreviewPhotos.Single(p => p.Id == first.Id).RecuerdoCount);
        Assert.Equal(new[] { first.Id, second.Id }, photos.Select(p => p.Id));
    }

    private static async Task SeedBaulAsync(IListReadModelContractStore store, BaulId baulId)
    {
        await store.AddBaulAsync(new Baul(baulId, $"Baul {baulId.Value}", null, User, 0, T0, T0));
    }

    private static Chapter NewChapter(ChapterId id, BaulId baulId, string name, int photoCount = 0) =>
        new(id, baulId, name, photoCount, T0, T0, User.Value);

    private static Photo NewPhoto(
        PhotoId id, BaulId baulId, ChapterId? chapterId, string key, DateTime createdAt, PhotoDate? date, Guid? uploadBatchId = null) =>
        Photo.Create(id, chapterId, baulId, key, date, User, createdAt, new(1, 1), uploadBatchId: uploadBatchId);

    private static Recuerdo NewRecuerdo(RecuerdoId id, BaulId baulId, PhotoId? photoId, ChapterId? chapterId, string text, DateTime createdAt) =>
        new(id, photoId, chapterId, baulId, User, text, createdAt);

    private static Persona NewPersona(BaulId baulId) =>
        new(new PersonaId(G(900)), baulId, User, "Persona", BaulRole.Colaborador, T0);

    private static PhotoDate Date(int year, int? month, int? day) =>
        PhotoDate.Parse(year, month, day).Value;

    private static BaulId B(int n) => new(G(n));
    private static ChapterId C(int n) => new(G(100 + n));
    private static PhotoId P(int n) => new(G(200 + n));
    private static RecuerdoId R(int n) => new(G(300 + n));

    private static Guid G(int n) => Guid.Parse($"00000000-0000-0000-0000-{n:000000000000}");
}
