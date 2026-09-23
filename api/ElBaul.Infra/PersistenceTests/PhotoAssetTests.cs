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
/// Slice 1 of the multi-vault photo groundwork (docs/.backlog issue #62): Photo and PhotoAsset
/// are now separate tables, strictly 1:1 for every current write path, but the schema itself
/// must already tolerate several Photos pointing at one PhotoAsset — see
/// docs/.backlog issue #62 §"Important architectural constraint". These tests exercise that
/// against real Postgres, since an in-memory fake can't prove a real FK/unique-index shape.
///
/// Slice 2 (same issue) turns that tolerance into a real feature — PhotoManager.AddToBaulAsync
/// via IPhotoRepository.TryAddExistingAssetAsync — and changes an important invariant: deleting
/// a Photo must never delete the PhotoAsset it points at, since another baúl's Photo may still
/// need it. The tests below with "Slice 2" in their name cover that directly against Postgres.
/// </summary>
[Collection(PersistenceTestCollection.Name)]
public class PhotoAssetTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
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
    public async Task CreateAsync_PersistsThePhotoAndItsOwnPhotoAsset_TogetherInOneWrite()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);

        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "some/storage/key.jpg", null,
            new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(800, 600),
            sizeBytes: 12345, originalContentHash: "abc123");

        await photos.CreateAsync(photo);

        var assetCount = await dbContext.PhotoAssets.CountAsync(a => a.Id == photo.PhotoAssetId);
        assetCount.Should().Be(1, "creating a Photo must create its own PhotoAsset in the same write");

        var reloaded = await photos.GetByIdAsync(photo.Id);
        reloaded.Should().NotBeNull();
        // Asset-intrinsic fields resolve through PhotoAsset (contextual ones stay directly on Photo).
        reloaded!.StorageKey.Should().Be("some/storage/key.jpg");
        reloaded.SizeBytes.Should().Be(12345);
        reloaded.Dimensions.Should().Be(new ImageDimensions(800, 600));
        reloaded.BaulId.Should().Be(baulId);
    }

    [Fact]
    public async Task TheSchema_AllowsTwoPhotos_ToReferenceTheSamePhotoAsset_AcrossDifferentBaules()
    {
        // Slice 2 turned "the schema tolerates it" into IX_Photos_BaulId_PhotoAssetId_Active,
        // which specifically forbids this same shape *within one baúl* — see
        // Slice2_TryAddExistingAssetAsync_ReturnsFalse_WhenTheAssetIsAlreadyActiveInTheSameBaul
        // below. Across two different baúles it's still exactly what the index (and Slice 2's
        // "Add to another baúl" feature) is meant to allow.
        await using var dbContext = Fixture.CreateDbContext();
        var baulA = await SeedBaulAsync(dbContext, "custodio-1");
        var baulB = await SeedBaulAsync(dbContext, "custodio-2");
        var photos = new PhotoRepository(dbContext);

        var first = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulA, "shared/key.jpg", null,
            new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(100, 100));
        await photos.CreateAsync(first);

        var second = new Photo(
            new PhotoId(Guid.NewGuid()), null, baulB, first.PhotoAsset, null,
            new UserId("custodio-2"), DateTime.UtcNow);
        await photos.CreateAsync(second);

        (await dbContext.PhotoAssets.CountAsync()).Should().Be(1, "both Photos share the one PhotoAsset row created above");
        (await dbContext.Photos.CountAsync(p => p.PhotoAssetId == first.PhotoAssetId)).Should().Be(2);

        var reloadedSecond = await photos.GetByIdAsync(second.Id);
        reloadedSecond!.StorageKey.Should().Be("shared/key.jpg", "the second Photo resolves the same asset's storage key");
    }

    [Fact]
    public async Task DeleteByBaulIdAsync_NeverDeletesThePhotoAsset_EvenWhenNoOtherPhotoReferencesItAnymore()
    {
        // Slice 2 (docs/.backlog issue #62): PhotoAsset lifetime is deliberately decoupled from
        // Photo lifetime from this slice onward — a PhotoAsset left with no referencing Photo is
        // an intentional orphan, not a bug. Slice 3 is expected to add garbage collection for it.
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);

        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "to-delete.jpg", null,
            new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(10, 10));
        await photos.CreateAsync(photo);

        await photos.DeleteByBaulIdAsync(baulId);

        (await dbContext.Photos.CountAsync(p => p.BaulId == baulId)).Should().Be(0);
        (await dbContext.PhotoAssets.CountAsync(a => a.Id == photo.PhotoAssetId)).Should().Be(1,
            "the asset must survive even though nothing references it anymore — see Slice 3");
    }

    [Fact]
    public async Task Slice2_GetAssetByIdAsync_ResolvesThePhotoAsset_WithNoPhotoOrBaulInTheLoop()
    {
        // PhotoManager.AddAssetToBaulAsync (Mis fotos wiring) authorizes off PhotoAsset.UploadedBy
        // directly, with no accessible source Photo to go through — this is the lookup that makes
        // that possible.
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);

        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "asset-lookup.jpg", null,
            new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(10, 10));
        await photos.CreateAsync(photo);

        var asset = await photos.GetAssetByIdAsync(photo.PhotoAssetId);

        asset.Should().NotBeNull();
        asset!.Id.Should().Be(photo.PhotoAssetId);
        asset.UploadedBy.Should().Be(new UserId("custodio-1"));
    }

    [Fact]
    public async Task Slice2_TryAddExistingAssetAsync_SharesThePhotoAssetAcrossTwoDifferentBaules()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulA = await SeedBaulAsync(dbContext, "custodio-a");
        var baulB = await SeedBaulAsync(dbContext, "custodio-b");
        var photos = new PhotoRepository(dbContext);

        var photoA = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulA, "shared/asset.jpg", null,
            new UserId("custodio-a"), DateTime.UtcNow, new ImageDimensions(100, 100));
        await photos.CreateAsync(photoA);

        // The "Add to another baúl" write path — PhotoManager.AddToBaulAsync derives this Photo
        // from photoA.PhotoAsset directly, never creating a second PhotoAsset.
        var photoB = Photo.CreateFromExistingAsset(
            new PhotoId(Guid.NewGuid()), baulB, photoA.PhotoAsset, photoA.TakenAt, new UserId("custodio-b"), DateTime.UtcNow);
        var inserted = await photos.TryAddExistingAssetAsync(photoB);

        inserted.Should().BeTrue();
        (await dbContext.PhotoAssets.CountAsync()).Should().Be(1, "both Photos share the one PhotoAsset created for photoA");
        (await dbContext.Photos.CountAsync(p => p.PhotoAssetId == photoA.PhotoAssetId)).Should().Be(2);

        var reloadedB = await photos.GetByIdAsync(photoB.Id);
        reloadedB!.StorageKey.Should().Be("shared/asset.jpg");
        reloadedB.BaulId.Should().Be(baulB);
    }

    [Fact]
    public async Task Slice2_TryAddExistingAssetAsync_ReturnsFalse_WhenTheAssetIsAlreadyActiveInTheSameBaul()
    {
        // Race-safety proof for IX_Photos_BaulId_PhotoAssetId_Active — a real unique-index
        // conflict, not an application-level pre-check, is what an in-memory fake can't cover.
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);

        var original = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "asset.jpg", null,
            new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(50, 50));
        await photos.CreateAsync(original);

        var duplicateAttempt = Photo.CreateFromExistingAsset(
            new PhotoId(Guid.NewGuid()), baulId, original.PhotoAsset, null, new UserId("custodio-1"), DateTime.UtcNow);
        var inserted = await photos.TryAddExistingAssetAsync(duplicateAttempt);

        inserted.Should().BeFalse();
        (await dbContext.Photos.CountAsync(p => p.PhotoAssetId == original.PhotoAssetId && p.Status == PhotoStatus.Active))
            .Should().Be(1, "the same asset must never be active twice in the same baúl");
    }

    [Fact]
    public async Task Slice2_DeleteAsync_OnOneSharedPhoto_LeavesTheOtherPhotoAndTheAssetIntact()
    {
        // One of the most important tests in Slice 2 — see docs/.backlog issue #62 §7.
        await using var dbContext = Fixture.CreateDbContext();
        var baulA = await SeedBaulAsync(dbContext, "custodio-a");
        var baulB = await SeedBaulAsync(dbContext, "custodio-b");
        var photos = new PhotoRepository(dbContext);

        var photoA = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulA, "shared/asset.jpg", null,
            new UserId("custodio-a"), DateTime.UtcNow, new ImageDimensions(100, 100));
        await photos.CreateAsync(photoA);
        var photoB = Photo.CreateFromExistingAsset(
            new PhotoId(Guid.NewGuid()), baulB, photoA.PhotoAsset, null, new UserId("custodio-b"), DateTime.UtcNow);
        (await photos.TryAddExistingAssetAsync(photoB)).Should().BeTrue();

        await photos.DeleteAsync(photoA.Id);

        (await photos.GetByIdAsync(photoA.Id)).Should().BeNull("photoA itself is gone");
        var reloadedB = await photos.GetByIdAsync(photoB.Id);
        reloadedB.Should().NotBeNull("photoB must survive deleting photoA");
        reloadedB!.StorageKey.Should().Be("shared/asset.jpg", "photoB's PhotoAsset must still resolve");
        (await dbContext.PhotoAssets.CountAsync(a => a.Id == photoA.PhotoAssetId)).Should().Be(1,
            "the shared PhotoAsset must not be deleted while photoB still references it");
    }

    [Fact]
    public async Task Slice2_DeleteAsync_OnTheLastPhotoReferencingAnAsset_LeavesItOrphaned()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);

        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "solo.jpg", null,
            new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(10, 10));
        await photos.CreateAsync(photo);

        await photos.DeleteAsync(photo.Id);

        (await photos.GetByIdAsync(photo.Id)).Should().BeNull();
        // Intentionally orphaned — see Photo.CreateFromExistingAsset's doc comment and
        // IAdminBaulDeletionRepository's: Slice 3 is expected to garbage-collect rows like this.
        (await dbContext.PhotoAssets.CountAsync(a => a.Id == photo.PhotoAssetId)).Should().Be(1);
    }

    [Fact]
    public async Task Slice2_DeleteByBaulIdAsync_OnABaulWithASharedAsset_LeavesTheOtherBaulsPhotoAndTheAssetIntact()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulA = await SeedBaulAsync(dbContext, "custodio-a");
        var baulB = await SeedBaulAsync(dbContext, "custodio-b");
        var photos = new PhotoRepository(dbContext);

        var photoA = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulA, "shared/asset.jpg", null,
            new UserId("custodio-a"), DateTime.UtcNow, new ImageDimensions(100, 100));
        await photos.CreateAsync(photoA);
        var photoB = Photo.CreateFromExistingAsset(
            new PhotoId(Guid.NewGuid()), baulB, photoA.PhotoAsset, null, new UserId("custodio-b"), DateTime.UtcNow);
        (await photos.TryAddExistingAssetAsync(photoB)).Should().BeTrue();

        // Regression guard for bulk-delete code (baúl hard-delete) — see
        // IAdminBaulDeletionRepository's doc comment.
        await photos.DeleteByBaulIdAsync(baulA);

        (await dbContext.Photos.CountAsync(p => p.BaulId == baulA)).Should().Be(0);
        var reloadedB = await photos.GetByIdAsync(photoB.Id);
        reloadedB.Should().NotBeNull();
        reloadedB!.StorageKey.Should().Be("shared/asset.jpg");
        (await dbContext.PhotoAssets.CountAsync(a => a.Id == photoA.PhotoAssetId)).Should().Be(1);
    }
}
