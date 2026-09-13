using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using ElBaul.Domain;
using ElBaul.Infra.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// The IPhotoRepository additions the deduplicate-photo-assets maintenance command needs
/// (docs/.backlog issue #64, Slice 4) — every one of them bypasses the change tracker
/// (ExecuteUpdateAsync/raw SQL), so only a real Postgres run can prove the SQL itself is correct
/// and respects IX_Photos_BaulId_PhotoAssetId_Active / IX_UserPhotoAssets_UserId_PhotoAssetId.
/// </summary>
[Collection(PersistenceTestCollection.Name)]
public class PhotoAssetDeduplicationTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    private async Task<BaulId> SeedBaulAsync(ElBaulDbContext dbContext, string custodioId = "custodio-1")
    {
        var users = new UserRepository(dbContext);
        var baules = new BaulRepository(dbContext);
        var custodio = new User(new UserId(custodioId), $"{custodioId}@example.com", "Custodio", null, DateTime.UtcNow);
        await users.UpsertAsync(custodio);
        var baulId = new BaulId(Guid.NewGuid());
        await baules.CreateAsync(new Baul(baulId, "Baúl de prueba", null, custodio.Id, 0, DateTime.UtcNow, DateTime.UtcNow));
        return baulId;
    }

    [Fact]
    public async Task GetAllAssetsAsync_ReturnsBothHashedAndLegacyNullHashAssets()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var hashed = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "a.jpg", null, new UserId("custodio-1"), DateTime.UtcNow,
            new ImageDimensions(1, 1), originalContentHash: "hash-a");
        var legacy = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "b.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        await photos.CreateAsync(hashed);
        await photos.CreateAsync(legacy);

        var all = await photos.GetAllAssetsAsync();

        all.Select(a => a.Id).Should().Contain([hashed.PhotoAssetId, legacy.PhotoAssetId]);
    }

    [Fact]
    public async Task RepointPhotoAssetIdAsync_UpdatesBothPhotoAssetIdAndTheDenormalizedHash()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var canonical = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "canonical.jpg", null, new UserId("custodio-1"), DateTime.UtcNow,
            new ImageDimensions(1, 1), originalContentHash: "canonical-hash");
        // toRepoint must live in a *different* baúl from canonical's own photo, or repointing it
        // onto the same asset the canonical photo already uses in this baúl would itself trip
        // IX_Photos_BaulId_PhotoAssetId_Active — that's exactly the same-baúl conflict
        // PhotoAssetMergeService resolves via PhotoDuplicateMergeService before ever calling this.
        var otherBaulId = await SeedBaulAsync(dbContext, "custodio-2");
        var toRepoint = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, otherBaulId, "other.jpg", null, new UserId("custodio-1"), DateTime.UtcNow,
            new ImageDimensions(1, 1));
        await photos.CreateAsync(canonical);
        await photos.CreateAsync(toRepoint);

        await photos.RepointPhotoAssetIdAsync([toRepoint.Id], canonical.PhotoAssetId, "canonical-hash");

        var reloaded = await photos.GetByIdAsync(toRepoint.Id);
        reloaded!.PhotoAssetId.Should().Be(canonical.PhotoAssetId);
        reloaded.OriginalContentHash.Should().Be("canonical-hash");
    }

    [Fact]
    public async Task RedirectUserPhotoAssetAsync_KeepsTheEarliestAddedAt_WhenTheUserAlreadyHasACanonicalRelation()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var canonical = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "canonical.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        await photos.CreateAsync(canonical);
        var laterAddedAt = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var earlierAddedAt = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        await photos.EnsureUserPhotoAssetActiveAsync(new UserId("custodio-1"), canonical.PhotoAssetId, laterAddedAt);

        await photos.RedirectUserPhotoAssetAsync(new UserId("custodio-1"), canonical.PhotoAssetId, earlierAddedAt);

        var relation = (await dbContext.UserPhotoAssets.AsNoTracking()
            .SingleAsync(r => r.UserId == new UserId("custodio-1") && r.PhotoAssetId == canonical.PhotoAssetId));
        relation.AddedAt.Should().Be(earlierAddedAt, "the earliest contribution date must survive a redirect merge");
    }

    [Fact]
    public async Task RedirectUserPhotoAssetAsync_InsertsAFreshRelation_WhenTheUserHadNoneOnTheCanonicalAssetYet()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var canonical = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "canonical.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        await photos.CreateAsync(canonical);
        var addedAt = new DateTime(2024, 3, 1, 0, 0, 0, DateTimeKind.Utc);

        await photos.RedirectUserPhotoAssetAsync(new UserId("jaime"), canonical.PhotoAssetId, addedAt);

        (await photos.HasUserPhotoAssetAsync(new UserId("jaime"), canonical.PhotoAssetId)).Should().BeTrue();
    }

    [Fact]
    public async Task DeleteUserPhotoAssetAsync_RemovesOnlyThatOneRelation()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var asset = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "a.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        await photos.CreateAsync(asset);
        await photos.EnsureUserPhotoAssetActiveAsync(new UserId("custodio-1"), asset.PhotoAssetId, DateTime.UtcNow);
        await photos.EnsureUserPhotoAssetActiveAsync(new UserId("jaime"), asset.PhotoAssetId, DateTime.UtcNow);

        await photos.DeleteUserPhotoAssetAsync(new UserId("custodio-1"), asset.PhotoAssetId);

        (await photos.HasUserPhotoAssetAsync(new UserId("custodio-1"), asset.PhotoAssetId)).Should().BeFalse();
        (await photos.HasUserPhotoAssetAsync(new UserId("jaime"), asset.PhotoAssetId)).Should().BeTrue();
    }

    [Fact]
    public async Task SetAssetContentHashAsync_PersistsTheHash_WithoutViolatingTheUniqueIndex()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var legacy = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "legacy.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        await photos.CreateAsync(legacy);

        await photos.SetAssetContentHashAsync(legacy.PhotoAssetId, "recomputed-hash");

        var reloaded = await photos.GetAssetByIdAsync(legacy.PhotoAssetId);
        reloaded!.OriginalContentHash.Should().Be("recomputed-hash");
    }

    [Fact]
    public async Task GetAllByAssetIdsAsync_IncludesSoftDeletedPhotos_UnlikeGetActiveByAssetIdsAsync()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "a.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        await photos.CreateAsync(photo);
        await photos.UpdateAsync(photo.MarkDeleted("test", DateTime.UtcNow));

        var all = await photos.GetAllByAssetIdsAsync([photo.PhotoAssetId]);
        var active = await photos.GetActiveByAssetIdsAsync([photo.PhotoAssetId]);

        all.Should().ContainSingle(p => p.Id == photo.Id);
        active.Should().BeEmpty("a soft-deleted photo must still be found so it can be repointed off a deleted duplicate asset");
    }
}
