using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using ElBaul.Domain;
using ElBaul.Infra.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// IX_Photos_BaulId_OriginalContentHash_Active is a *partial* unique index (Active + non-null
/// hash only) — exactly the kind of predicate an in-memory fake enforces with hand-written C#
/// (see InMemoryPhotoRepository), which can't prove the real index actually behaves the way its
/// filter string says. These tests exercise PhotoRepository.TryCreateActiveAsync directly
/// against real Postgres: the final concurrency guard behind PhotoUploadWorkflow's app-level
/// pre-check (see docs/.backlog issue #20 §24).
/// </summary>
[Collection(PersistenceTestCollection.Name)]
public class PhotoContentHashConstraintTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    private async Task<BaulId> SeedBaulAsync(ElBaulDbContext dbContext, string custodioId = "custodio-1")
    {
        var users = new UserRepository(dbContext);
        var baules = new BaulRepository(dbContext);
        var custodio = new User(new UserId(custodioId), $"{custodioId}@example.com", "Custodio", DateTime.UtcNow);
        await users.UpsertAsync(custodio);
        var baulId = new BaulId(Guid.NewGuid());
        await baules.CreateAsync(new Baul(baulId, "Baúl de prueba", null, custodio.Id, 0, DateTime.UtcNow, DateTime.UtcNow));
        return baulId;
    }

    private static Photo ActivePhoto(BaulId baulId, string storageKey, string? hash) =>
        Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, storageKey, null, new UserId("custodio-1"), DateTime.UtcNow,
            originalContentHash: hash);

    [Fact]
    public async Task TryCreateActiveAsync_RejectsASecondActivePhoto_WithTheSameHashInTheSameBaul()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);

        var winner = ActivePhoto(baulId, "winner-key", "shared-hash");
        (await photos.TryCreateActiveAsync(winner)).Should().BeTrue();

        // Simulates a second, concurrent upload of the exact same file to the same baúl landing
        // after the first has already committed.
        var loser = ActivePhoto(baulId, "loser-key", "shared-hash");
        (await photos.TryCreateActiveAsync(loser)).Should().BeFalse(
            "the partial unique index conflict is absorbed by ON CONFLICT DO NOTHING, not an exception");

        (await dbContext.Photos.AsNoTracking().CountAsync(p => p.BaulId == baulId)).Should().Be(1,
            "the losing insert must not have persisted any row");
    }

    [Fact]
    public async Task TryCreateActiveAsync_AllowsTheSameHash_InADifferentBaul()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulA = await SeedBaulAsync(dbContext, "custodio-a");
        var baulB = await SeedBaulAsync(dbContext, "custodio-b");
        var photos = new PhotoRepository(dbContext);

        (await photos.TryCreateActiveAsync(ActivePhoto(baulA, "key-a", "shared-hash"))).Should().BeTrue();
        (await photos.TryCreateActiveAsync(ActivePhoto(baulB, "key-b", "shared-hash"))).Should().BeTrue();

        (await dbContext.Photos.AsNoTracking().CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task TryCreateActiveAsync_AllowsTheSameHash_WhenThePreviousRowIsSoftDeleted()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);

        var deleted = ActivePhoto(baulId, "deleted-key", "shared-hash").MarkDeleted("some reason", DateTime.UtcNow);
        await photos.CreateAsync(deleted);

        var newActive = ActivePhoto(baulId, "new-key", "shared-hash");
        (await photos.TryCreateActiveAsync(newActive)).Should().BeTrue(
            "a soft-deleted duplicate must never block a later legitimate active upload");

        (await dbContext.Photos.AsNoTracking().CountAsync(p => p.Status == PhotoStatus.Active && p.BaulId == baulId)).Should().Be(1);
    }

    [Fact]
    public async Task TryCreateActiveAsync_AllowsMultipleActivePhotos_WithANullHash()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var photos = new PhotoRepository(dbContext);

        (await photos.TryCreateActiveAsync(ActivePhoto(baulId, "a", null))).Should().BeTrue();
        (await photos.TryCreateActiveAsync(ActivePhoto(baulId, "b", null))).Should().BeTrue();

        (await dbContext.Photos.AsNoTracking().CountAsync(p => p.BaulId == baulId)).Should().Be(2);
    }
}
