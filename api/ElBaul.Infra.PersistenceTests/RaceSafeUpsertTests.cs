using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Sharing.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using ElBaul.Domain;
using ElBaul.Infra.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// UserRepository.UpsertAsync, BaulInviteLinkRepository.CreateAsync, EmailLinkClickRepository.
/// RegisterSignedClickAsync and SentEmailRepository.TryReserveAsync each resolve a
/// concurrent-insert race with a native <c>INSERT ... ON CONFLICT</c> instead of a caught
/// <c>DbUpdateException</c> — a real unique constraint (and, for BaulInviteLinks, a partial index
/// with a predicate) is exactly the kind of behavior ElBaul.Infra.Lite's in-memory fakes cannot
/// reproduce, since they enforce no uniqueness at all. These tests simulate the race
/// deterministically — seed the "winning" row directly, then call the method under test — rather
/// than with real concurrent threads, which would make the outcome non-deterministic without
/// proving anything an ON CONFLICT clause doesn't already guarantee. See README.md.
/// </summary>
[Collection(PersistenceTestCollection.Name)]
public class RaceSafeUpsertTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    [Fact]
    public async Task UserRepository_UpsertAsync_a_second_call_updates_in_place_and_keeps_the_original_CreatedAt()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);

        var originalCreatedAt = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var userId = new UserId("race-user-1");
        await users.UpsertAsync(new User(userId, "first@example.com", "Primer nombre", originalCreatedAt));

        // Simulates a second, concurrent UserSyncMiddleware call landing after the first —
        // same Id, different profile data and (deliberately wrong) CreatedAt.
        await users.UpsertAsync(new User(userId, "second@example.com", "Segundo nombre", DateTime.UtcNow, LastAccessAt: DateTime.UtcNow));

        var stored = await users.GetByIdAsync(userId);
        stored.Should().NotBeNull();
        stored.Email.Should().Be("second@example.com", "ON CONFLICT DO UPDATE applies the second call's data");
        stored.Name.Should().Be("Segundo nombre");
        stored.CreatedAt.Should().Be(originalCreatedAt, "CreatedAt is excluded from the DO UPDATE SET list on purpose");
    }

    [Fact]
    public async Task UserRepository_UpsertAsync_parallel_first_syncs_for_the_same_user_do_not_trip_the_email_unique_index()
    {
        var userId = new UserId("parallel-sync-user");
        var createdAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        var writes = Enumerable.Range(0, 8).Select(async i =>
        {
            await using var dbContext = Fixture.CreateDbContext();
            var users = new UserRepository(dbContext);
            await users.UpsertAsync(new User(userId, "parallel-sync@example.com", $"Nombre {i}", createdAt.AddSeconds(i)));
        });

        await FluentActions.Awaiting(() => Task.WhenAll(writes)).Should().NotThrowAsync(
            "the email advisory lock serializes first-time UserSyncMiddleware requests before the unique Email index is checked");

        await using var assertionContext = Fixture.CreateDbContext();
        (await assertionContext.Users.CountAsync(u => u.Id == userId)).Should().Be(1);
        (await assertionContext.Users.CountAsync(u => u.Email == "parallel-sync@example.com")).Should().Be(1);
    }

    [Fact]
    public async Task BaulInviteLinkRepository_CreateAsync_a_losing_insert_for_the_same_baul_is_a_silent_no_op()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var baules = new BaulRepository(dbContext);
        var links = new BaulInviteLinkRepository(dbContext);

        var custodio = new User(new UserId("race-custodio"), "custodio@example.com", "Custodio", DateTime.UtcNow);
        await users.UpsertAsync(custodio);
        var baul = new Baul(new BaulId(Guid.NewGuid()), "Baúl con carrera de invite link", Description: null,
            custodio.Id, ChapterCount: 0, DateTime.UtcNow, DateTime.UtcNow);
        await baules.CreateAsync(baul);

        var winner = new BaulInviteLink(new BaulInviteLinkId(Guid.NewGuid()), "winner-token", baul.Id, custodio.Id, DateTime.UtcNow);
        var loser = new BaulInviteLink(new BaulInviteLinkId(Guid.NewGuid()), "loser-token", baul.Id, custodio.Id, DateTime.UtcNow);

        await links.CreateAsync(winner);
        // Simulates a concurrent GetOrCreateAsync call racing for the same baúl — must not
        // throw, and must not create a second active link.
        var act = async () => await links.CreateAsync(loser);
        await act.Should().NotThrowAsync("the partial unique index conflict is absorbed by ON CONFLICT DO NOTHING, not an exception");

        // Compares by Id/Token rather than full equivalence: Postgres' microsecond timestamp
        // precision vs. .NET DateTime's tick precision makes CreatedAt lossy across a round
        // trip, which isn't what this test is about.
        (await links.GetActiveByBaulIdAsync(baul.Id)).Should().BeEquivalentTo(new { winner.Id, winner.Token });
        (await links.GetByTokenAsync(loser.Token)).Should().BeNull("the losing insert must not have persisted any row");
    }

    [Fact]
    public async Task BaulInviteLinkRepository_CreateAsync_a_genuine_token_collision_still_throws()
    {
        // Distinguishes the two independent unique constraints on BaulInviteLinks: the ON
        // CONFLICT clause targets only the partial index on (BaulId) WHERE RevokedAt IS NULL, so
        // a collision on the *other* unique index (Token) must still surface as a real failure —
        // proving the fix is more precise than the try/catch-any-UniqueViolation it replaced,
        // which could not tell the two apart.
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var baules = new BaulRepository(dbContext);
        var links = new BaulInviteLinkRepository(dbContext);

        var custodio = new User(new UserId("race-custodio-2"), "custodio2@example.com", "Custodio", DateTime.UtcNow);
        await users.UpsertAsync(custodio);
        var baulA = new Baul(new BaulId(Guid.NewGuid()), "Baúl A", Description: null, custodio.Id, ChapterCount: 0, DateTime.UtcNow, DateTime.UtcNow);
        var baulB = new Baul(new BaulId(Guid.NewGuid()), "Baúl B", Description: null, custodio.Id, ChapterCount: 0, DateTime.UtcNow, DateTime.UtcNow);
        await baules.CreateAsync(baulA);
        await baules.CreateAsync(baulB);

        await links.CreateAsync(new BaulInviteLink(new BaulInviteLinkId(Guid.NewGuid()), "shared-token", baulA.Id, custodio.Id, DateTime.UtcNow));

        // Different baúl (so it doesn't hit the ON CONFLICT target), same token.
        var act = async () => await links.CreateAsync(
            new BaulInviteLink(new BaulInviteLinkId(Guid.NewGuid()), "shared-token", baulB.Id, custodio.Id, DateTime.UtcNow));

        await act.Should().ThrowAsync<Exception>("a Token collision is a different unique index than the one ON CONFLICT targets");
    }

    [Fact]
    public async Task EmailLinkClickRepository_RegisterSignedClickAsync_a_losing_insert_falls_back_to_updating_the_winner()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var sentEmails = new SentEmailRepository(dbContext);
        var clicks = new EmailLinkClickRepository(dbContext);

        var user = new User(new UserId("race-email-user"), "user@example.com", "Usuario", DateTime.UtcNow);
        await users.UpsertAsync(user);
        var sentEmail = new SentEmail(Guid.NewGuid(), user.Id, EmailType.Welcome, "Asunto", user.Email,
            "v1", "es", EmailStatus.Sent, "dedup-key-race", DateTime.UtcNow);
        await sentEmails.TryReserveAsync(sentEmail);

        const string token = "shared-click-token";
        var firstClickedAt = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        await clicks.RegisterSignedClickAsync(token, sentEmail.Id, "link-key", "https://example.com", firstClickedAt);

        // Simulates a second, near-simultaneous click on the same signed link (same
        // deterministic token) landing after the first has already inserted the row.
        var secondClickedAt = firstClickedAt.AddSeconds(1);
        var act = async () => await clicks.RegisterSignedClickAsync(token, sentEmail.Id, "link-key", "https://example.com", secondClickedAt);
        await act.Should().NotThrowAsync("the Token conflict is absorbed by ON CONFLICT DO NOTHING, not an exception");

        var stored = await clicks.GetByTokenAsync(token);
        stored.Should().NotBeNull();
        stored.ClickCount.Should().Be(2, "the losing insert must fall back to RegisterClickAsync's increment, not be dropped silently");
        stored.FirstClickedAt.Should().Be(firstClickedAt);
        stored.LastClickedAt.Should().Be(secondClickedAt);
    }

    [Fact]
    public async Task SentEmailRepository_TryReserveAsync_a_losing_reservation_for_the_same_deduplication_key_is_rejected()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var sentEmails = new SentEmailRepository(dbContext);

        var user = new User(new UserId("race-reserve-user"), "reserve@example.com", "Usuario", DateTime.UtcNow);
        await users.UpsertAsync(user);

        var winner = new SentEmail(Guid.NewGuid(), user.Id, EmailType.Welcome, "Asunto", user.Email,
            "v1", "es", EmailStatus.Pending, "dedup-key-reserve-race", DateTime.UtcNow);
        (await sentEmails.TryReserveAsync(winner)).Should().BeTrue();

        // Simulates a second, concurrent Hangfire worker retrying the same job — same
        // DeduplicationKey, different row.
        var loser = new SentEmail(Guid.NewGuid(), user.Id, EmailType.Welcome, "Asunto", user.Email,
            "v1", "es", EmailStatus.Pending, "dedup-key-reserve-race", DateTime.UtcNow);
        (await sentEmails.TryReserveAsync(loser)).Should().BeFalse(
            "the DeduplicationKey conflict is absorbed by ON CONFLICT DO NOTHING and reported via the return value, not an exception");

        var stored = await sentEmails.GetByDeduplicationKeyAsync("dedup-key-reserve-race");
        stored.Should().NotBeNull();
        stored.Id.Should().Be(winner.Id, "the losing reservation must not overwrite or duplicate the winner's row");
    }
}
