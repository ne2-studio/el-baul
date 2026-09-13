using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using ElBaul.Domain;
using ElBaul.Infra.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// Slice 2.5 of the multi-vault photo groundwork (docs/.backlog issue #62): exact-duplicate
/// reuse of a canonical PhotoAsset across baúles/users, and the explicit UserPhotoAsset relation
/// that replaces PhotoAsset.UploadedBy as the source of truth for "Mis fotos". These tests
/// exercise both database-level invariants (IX_PhotoAssets_OriginalContentHash,
/// IX_UserPhotoAssets_UserId_PhotoAssetId) and the race-safety of TryCreateAssetAsync /
/// TryCreateUserPhotoAssetAsync against real Postgres, since an in-memory fake can't prove either.
/// </summary>
[Collection(PersistenceTestCollection.Name)]
public class UserPhotoAssetTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
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
    public async Task TryCreateAssetAsync_RejectsASecondPhotoAsset_WithTheSameContentHash_GloballyAcrossBaules()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulA = await SeedBaulAsync(dbContext, "custodio-a");
        var baulB = await SeedBaulAsync(dbContext, "custodio-b");
        var photos = new PhotoRepository(dbContext);

        var first = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulA, "first.jpg", null, new UserId("custodio-a"), DateTime.UtcNow,
            new ImageDimensions(10, 10), originalContentHash: "shared-hash");
        (await photos.TryCreateAssetAsync(first.PhotoAsset)).Should().BeTrue();

        // A second, unrelated upload of the exact same bytes into a different baúl must never
        // mint a second canonical PhotoAsset — this is the database-level guard behind
        // PhotoUploadWorkflow's global exact-duplicate reuse.
        var second = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulB, "second.jpg", null, new UserId("custodio-b"), DateTime.UtcNow,
            new ImageDimensions(10, 10), originalContentHash: "shared-hash");
        (await photos.TryCreateAssetAsync(second.PhotoAsset)).Should().BeFalse(
            "IX_PhotoAssets_OriginalContentHash is global, not scoped to a baúl");

        (await dbContext.PhotoAssets.CountAsync(a => a.OriginalContentHash == "shared-hash")).Should().Be(1);
    }

    [Fact]
    public async Task TryCreateAssetAsync_AllowsMultiplePhotoAssets_WithANullHash()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);

        var first = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "a.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        var second = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "b.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));

        (await photos.TryCreateAssetAsync(first.PhotoAsset)).Should().BeTrue();
        (await photos.TryCreateAssetAsync(second.PhotoAsset)).Should().BeTrue(
            "legacy/hashless assets must never collide with each other");
    }

    [Fact]
    public async Task TryCreateAssetAsync_IsRaceSafe_ForConcurrentUploadsOfTheSamePreviouslyUnseenBytes()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);

        // Same hash, ten different PhotoAsset ids racing to be the canonical one — simulates ten
        // concurrent uploads of the same brand-new file (see PhotoUploadWorkflow.CreatePhotoAsync).
        var attempts = Enumerable.Range(0, 10).Select(async _ =>
        {
            await using var raceDbContext = Fixture.CreateDbContext();
            var repo = new PhotoRepository(raceDbContext);
            var photo = Photo.Create(
                new PhotoId(Guid.NewGuid()), null, baulId, "race.jpg", null, new UserId("custodio-1"), DateTime.UtcNow,
                new ImageDimensions(1, 1), originalContentHash: "race-hash");
            return await repo.TryCreateAssetAsync(photo.PhotoAsset);
        });

        var results = await Task.WhenAll(attempts);

        results.Count(inserted => inserted).Should().Be(1, "exactly one concurrent insert may win the race");
        (await dbContext.PhotoAssets.CountAsync(a => a.OriginalContentHash == "race-hash")).Should().Be(1);
    }

    [Fact]
    public async Task TryCreateUserPhotoAssetAsync_RejectsADuplicateRelation_ForTheSameUserAndAsset()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "asset.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        await photos.CreateAsync(photo);

        (await photos.TryCreateUserPhotoAssetAsync(new UserId("custodio-1"), photo.PhotoAssetId, DateTime.UtcNow)).Should().BeTrue();
        (await photos.TryCreateUserPhotoAssetAsync(new UserId("custodio-1"), photo.PhotoAssetId, DateTime.UtcNow)).Should().BeFalse(
            "(UserId, PhotoAssetId) must be unique");

        (await dbContext.UserPhotoAssets.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task TryCreateUserPhotoAssetAsync_AllowsDifferentUsers_ToEachHoldTheirOwnRelation_ToTheSameAsset()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "asset.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        await photos.CreateAsync(photo);

        (await photos.TryCreateUserPhotoAssetAsync(new UserId("custodio-1"), photo.PhotoAssetId, DateTime.UtcNow)).Should().BeTrue();
        (await photos.TryCreateUserPhotoAssetAsync(new UserId("jaime"), photo.PhotoAssetId, DateTime.UtcNow)).Should().BeTrue();

        (await photos.GetByContributorAsync(new UserId("custodio-1"))).Should().ContainSingle(a => a.Id == photo.PhotoAssetId);
        (await photos.GetByContributorAsync(new UserId("jaime"))).Should().ContainSingle(a => a.Id == photo.PhotoAssetId);
    }

    [Fact]
    public async Task TryCreateUserPhotoAssetAsync_IsRaceSafe_ForConcurrentRelationCreation()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "asset.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        await photos.CreateAsync(photo);

        var attempts = Enumerable.Range(0, 10).Select(async _ =>
        {
            await using var raceDbContext = Fixture.CreateDbContext();
            var repo = new PhotoRepository(raceDbContext);
            return await repo.TryCreateUserPhotoAssetAsync(new UserId("custodio-1"), photo.PhotoAssetId, DateTime.UtcNow);
        });

        var results = await Task.WhenAll(attempts);

        results.Count(inserted => inserted).Should().Be(1);
        (await dbContext.UserPhotoAssets.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task GetAssetByContentHashAsync_FindsTheCanonicalAsset_RegardlessOfWhichBaulItWasCreatedFor()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "asset.jpg", null, new UserId("custodio-1"), DateTime.UtcNow,
            new ImageDimensions(1, 1), originalContentHash: "findme-hash");
        await photos.CreateAsync(photo);

        var found = await photos.GetAssetByContentHashAsync("findme-hash");

        found.Should().NotBeNull();
        found!.Id.Should().Be(photo.PhotoAssetId);
    }

    [Fact]
    public async Task DeleteAsync_OnAPhoto_NeverRemovesTheUserPhotoAssetRelation()
    {
        // Deletion safety (Slice 2.5, docs/.backlog issue #62 §8): a UserPhotoAsset relation
        // records "this user has this asset in Mis fotos" — removing one Photo projection in one
        // baúl must never silently drop it out of the user's Mis fotos.
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "asset.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        await photos.CreateAsync(photo);
        await photos.TryCreateUserPhotoAssetAsync(new UserId("custodio-1"), photo.PhotoAssetId, DateTime.UtcNow);

        await photos.DeleteAsync(photo.Id);

        (await photos.HasUserPhotoAssetAsync(new UserId("custodio-1"), photo.PhotoAssetId)).Should().BeTrue();
        (await dbContext.PhotoAssets.CountAsync(a => a.Id == photo.PhotoAssetId)).Should().Be(1,
            "the canonical asset must survive too — still referenced by the UserPhotoAsset relation");
    }

    [Fact]
    public async Task HasUserPhotoAssetAsync_ReflectsExactlyTheExplicitRelation()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "asset.jpg", null, new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(1, 1));
        await photos.CreateAsync(photo);

        (await photos.HasUserPhotoAssetAsync(new UserId("custodio-1"), photo.PhotoAssetId)).Should().BeFalse(
            "CreateAsync alone never creates the UserPhotoAsset relation");

        await photos.TryCreateUserPhotoAssetAsync(new UserId("custodio-1"), photo.PhotoAssetId, DateTime.UtcNow);

        (await photos.HasUserPhotoAssetAsync(new UserId("custodio-1"), photo.PhotoAssetId)).Should().BeTrue();
        (await photos.HasUserPhotoAssetAsync(new UserId("jaime"), photo.PhotoAssetId)).Should().BeFalse();
    }
}
