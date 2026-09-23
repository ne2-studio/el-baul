using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Sharing.Domain;
using ElBaul.Core.Notifications.Domain;
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
/// UserRepository.UpsertAsync, EmailLinkClickRepository.RegisterSignedClickAsync and
/// SentEmailRepository.TryReserveAsync each resolve a concurrent-insert race with a native
/// <c>INSERT ... ON CONFLICT</c> instead of a caught <c>DbUpdateException</c> — a real unique
/// constraint is exactly the kind of behavior ElBaul.Infra.Lite's in-memory fakes cannot
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
        await users.UpsertAsync(new User(userId, "first@example.com", "Primer nombre", null, originalCreatedAt));

        // Simulates a second, concurrent UserSyncMiddleware call landing after the first —
        // same Id, different profile data and (deliberately wrong) CreatedAt.
        await users.UpsertAsync(new User(userId, "second@example.com", "Segundo nombre", null, DateTime.UtcNow, LastAccessAt: DateTime.UtcNow));

        var stored = await users.GetByIdAsync(userId);
        stored.Should().NotBeNull();
        stored.Email.Should().Be("second@example.com", "ON CONFLICT DO UPDATE applies the second call's data");
        stored.Nombre.Should().Be("Segundo nombre");
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
            await users.UpsertAsync(new User(userId, "parallel-sync@example.com", $"Nombre {i}", null, createdAt.AddSeconds(i)));
        });

        await FluentActions.Awaiting(() => Task.WhenAll(writes)).Should().NotThrowAsync(
            "the email advisory lock serializes first-time UserSyncMiddleware requests before the unique Email index is checked");

        await using var assertionContext = Fixture.CreateDbContext();
        (await assertionContext.Users.CountAsync(u => u.Id == userId)).Should().Be(1);
        (await assertionContext.Users.CountAsync(u => u.Email == "parallel-sync@example.com")).Should().Be(1);
    }

    [Fact]
    public async Task EmailLinkClickRepository_RegisterSignedClickAsync_a_losing_insert_falls_back_to_updating_the_winner()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var sentEmails = new SentEmailRepository(dbContext);
        var clicks = new EmailLinkClickRepository(dbContext);

        var user = new User(new UserId("race-email-user"), "user@example.com", "Usuario", null, DateTime.UtcNow);
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

        var user = new User(new UserId("race-reserve-user"), "reserve@example.com", "Usuario", null, DateTime.UtcNow);
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
