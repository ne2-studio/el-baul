using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Domain;
using ElBaul.Infra.Persistence;
using FluentAssertions;
namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// Regression coverage for GitHub issue #76: bulk "Add to a baúl" from "Mis fotos" only added
/// the first selected photo, then the whole request died with a 500.
///
/// The root cause only reproduces against a real EF Core `DbContext` talking to a real database
/// — <see cref="BaulRepository.GetByIdAsync"/> is `AsNoTracking`, so each call returns a fresh,
/// untracked <see cref="Baul"/> instance, and <see cref="BaulRepository.UpdateAsync"/> calls
/// plain `dbContext.Baules.Update(baul)`, which attaches that instance to the change tracker and
/// never detaches it. Two calls against the *same* request-scoped `DbContext`, targeting the
/// same baúl, make EF Core throw `InvalidOperationException` on the second `Update()` call —
/// "another instance with the same key value ... is already being tracked". An in-memory fake
/// repository has no change tracker at all, so it can't reproduce this; it belongs here, not in
/// `ElBaul.Core.Tests`.
/// </summary>
[Collection(PersistenceTestCollection.Name)]
public class BaulPhotoCoverListenerTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    [Fact]
    public async Task OnPhotoAddedAsync_HandlesSeveralPhotosAddedToTheSameBaul_OnOneRequestScopedDbContext()
    {
        // The baúl and its photos are seeded through their own DbContext, exactly like
        // production: they were created in an earlier, already-completed request, not the one
        // that runs the batch. Only the batch's own request-scoped DbContext below matters for
        // reproducing the bug. Real Photo rows are required, not just PhotoIds, because
        // Baul.CoverPhotoId carries a real FK to Photos.
        var baulId = new BaulId(Guid.NewGuid());
        var firstPhotoId = new PhotoId(Guid.NewGuid());
        var secondPhotoId = new PhotoId(Guid.NewGuid());
        await using (var setupDbContext = Fixture.CreateDbContext())
        {
            var setupUsers = new UserRepository(setupDbContext);
            var setupBaules = new BaulRepository(setupDbContext);
            var setupPhotos = new PhotoRepository(setupDbContext);
            var custodio = new User(new UserId("custodio-1"), "custodio-1@example.com", "Custodio", null, DateTime.UtcNow);
            await setupUsers.UpsertAsync(custodio);
            await setupBaules.CreateAsync(new Baul(baulId, "Baúl de prueba", null, custodio.Id, 0, DateTime.UtcNow, DateTime.UtcNow));
            await setupPhotos.CreateAsync(Photo.Create(
                firstPhotoId, null, baulId, "first/storage/key.jpg", null, custodio.Id, DateTime.UtcNow,
                new ImageDimensions(800, 600), sizeBytes: 111, originalContentHash: "first-hash"));
            await setupPhotos.CreateAsync(Photo.Create(
                secondPhotoId, null, baulId, "second/storage/key.jpg", null, custodio.Id, DateTime.UtcNow,
                new ImageDimensions(800, 600), sizeBytes: 222, originalContentHash: "second-hash"));
        }

        // Mirrors PhotoManager.AddAssetsToBaulBatchAsync's loop: one request-scoped DbContext,
        // several photos, same target baúl, each iteration calling the listener exactly like the
        // real batch endpoint does.
        await using var dbContext = Fixture.CreateDbContext();
        var baules = new BaulRepository(dbContext);
        var listener = new BaulPhotoCoverListener(baules);
        var now = DateTime.UtcNow;

        await listener.OnPhotoAddedAsync(baulId, firstPhotoId, now);
        // Before the fix, this second call throws InvalidOperationException — the entity from
        // the first call is still tracked on this same dbContext.
        var act = async () => await listener.OnPhotoAddedAsync(baulId, secondPhotoId, now);

        await act.Should().NotThrowAsync();
        var reloaded = await baules.GetByIdAsync(baulId);
        // WithPhotoAdded only ever sets the cover once (first photo in) — the second call must
        // still succeed even though it's a no-op on CoverPhotoId.
        reloaded!.CoverPhotoId.Should().Be(firstPhotoId);
    }
}
