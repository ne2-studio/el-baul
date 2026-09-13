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
    public async Task TheSchema_AllowsTwoPhotos_ToReferenceTheSamePhotoAsset()
    {
        // No current application flow creates this shape yet (see Photo.Create's doc comment) —
        // this test only proves the persistence model doesn't stand in Slice 2's way.
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);

        var first = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "shared/key.jpg", null,
            new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(100, 100));
        await photos.CreateAsync(first);

        var second = new Photo(
            new PhotoId(Guid.NewGuid()), null, baulId, first.PhotoAsset, null,
            new UserId("custodio-1"), DateTime.UtcNow);
        await photos.CreateAsync(second);

        (await dbContext.PhotoAssets.CountAsync()).Should().Be(1, "both Photos share the one PhotoAsset row created above");
        (await dbContext.Photos.CountAsync(p => p.PhotoAssetId == first.PhotoAssetId)).Should().Be(2);

        var reloadedSecond = await photos.GetByIdAsync(second.Id);
        reloadedSecond!.StorageKey.Should().Be("shared/key.jpg", "the second Photo resolves the same asset's storage key");
    }

    [Fact]
    public async Task DeleteByBaulIdAsync_AlsoRemovesTheNowUnreferencedPhotoAssets()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);

        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "to-delete.jpg", null,
            new UserId("custodio-1"), DateTime.UtcNow, new ImageDimensions(10, 10));
        await photos.CreateAsync(photo);

        await photos.DeleteByBaulIdAsync(baulId);

        (await dbContext.Photos.CountAsync(p => p.BaulId == baulId)).Should().Be(0);
        (await dbContext.PhotoAssets.CountAsync(a => a.Id == photo.PhotoAssetId)).Should().Be(0);
    }
}
