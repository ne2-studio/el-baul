using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Chat.Domain;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chat.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using ElBaul.Domain;
using ElBaul.Infra.Analytics;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Infra.PersistenceTests;

[Collection(PersistenceTestCollection.Name)]
public class UserBaulActivityDailyAggregatorTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    [Fact]
    public async Task AggregateForDateAsync_RebuildsUniqueUserBaulRows_AndMarksContributors()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var contributor = new UserId("contributor");
        var reader = new UserId("reader");
        var date = new DateOnly(2026, 8, 11);

        dbContext.Photos.Add(Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, "photo-key", null, contributor,
            new DateTime(2026, 8, 11, 10, 0, 0, DateTimeKind.Utc), new(1, 1)));
        dbContext.Recuerdos.Add(new Recuerdo(
            new RecuerdoId(Guid.NewGuid()), null, null, baulId, contributor, "Texto",
            new DateTime(2026, 8, 11, 11, 0, 0, DateTimeKind.Utc)));
        dbContext.ChatMessages.Add(new ChatMessage(
            Guid.NewGuid(), baulId, reader, ChatMessageRole.User, "Pregunta",
            new DateTime(2026, 8, 11, 12, 0, 0, DateTimeKind.Utc)));
        await dbContext.SaveChangesAsync();

        var aggregator = CreateAggregator(dbContext);
        await aggregator.AggregateForDateAsync(date);
        await aggregator.AggregateForDateAsync(date);

        var rows = await ReadRowsAsync(dbContext);
        rows.Should().BeEquivalentTo([
            new ActivityRow(date, contributor.Value, baulId.Value, true),
            new ActivityRow(date, reader.Value, baulId.Value, false)
        ]);
    }

    [Fact]
    public async Task AggregateForDateAsync_UsesFunctionalTimezone_ForDateBoundaries()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var baulId = await SeedBaulAsync(dbContext);
        var userId = new UserId("timezone-user");

        dbContext.ChatMessages.Add(new ChatMessage(
            Guid.NewGuid(), baulId, userId, ChatMessageRole.User, "Late local day",
            new DateTime(2026, 8, 10, 22, 30, 0, DateTimeKind.Utc)));
        await dbContext.SaveChangesAsync();

        var aggregator = CreateAggregator(dbContext);
        await aggregator.AggregateForDateAsync(new DateOnly(2026, 8, 11));

        var rows = await ReadRowsAsync(dbContext);
        rows.Should().ContainSingle().Which.Should().Be(
            new ActivityRow(new DateOnly(2026, 8, 11), userId.Value, baulId.Value, false));
    }

    private static UserBaulActivityDailyAggregator CreateAggregator(ElBaulDbContext dbContext)
    {
        return new UserBaulActivityDailyAggregator(
            dbContext, new TestAppConfiguration(), NullLogger<UserBaulActivityDailyAggregator>.Instance);
    }

    private static async Task<BaulId> SeedBaulAsync(ElBaulDbContext dbContext)
    {
        var custodio = new User(new UserId("custodio"), "custodio@example.com", "Custodio", null, DateTime.UtcNow);
        var baul = new Baul(new BaulId(Guid.NewGuid()), "Baul", null, custodio.Id, 0, DateTime.UtcNow, DateTime.UtcNow);
        dbContext.Users.AddRange(
            custodio,
            new User(new UserId("contributor"), "contributor@example.com", "Contributor", null, DateTime.UtcNow),
            new User(new UserId("reader"), "reader@example.com", "Reader", null, DateTime.UtcNow),
            new User(new UserId("timezone-user"), "timezone@example.com", "Timezone", null, DateTime.UtcNow));
        dbContext.Baules.Add(baul);
        await dbContext.SaveChangesAsync();
        return baul.Id;
    }

    private static async Task<List<ActivityRow>> ReadRowsAsync(ElBaulDbContext dbContext) =>
        await dbContext.Database.SqlQuery<ActivityRow>(
            $"""
            SELECT date AS "Date", user_id AS "UserId", baul_id AS "BaulId", is_contributor AS "IsContributor"
            FROM analytics.user_baul_activity_daily
            ORDER BY user_id
            """).ToListAsync();

    private sealed record ActivityRow(DateOnly Date, string UserId, Guid BaulId, bool IsContributor);

    private sealed class TestAppConfiguration : IAppConfiguration
    {
        public string PublicUrl => "";
        public string ApiPublicUrl => "";
        public string AdminTestEmailRecipient => "";
        public string FunctionalTimeZoneId => "Europe/Madrid";
        public string HelpCenterUrl => "";
        public string PrivacyPolicyUrl => "";
        public string OnboardingVideoUrl => "";
        public bool WelcomeEmailsEnabled => false;
        public bool WeeklyDigestEmailsEnabled => false;
        public bool ChatEnabled => false;
        public bool ChatSuggestionsEnabled => false;
        public bool ChatMemoryEnabled => false;
        public int ChatMemoryRetrievalLimit => 0;
        public double WriteMemorySuggestionRatio => 0.2;
        public bool SharedLinksEnabled => false;
        public bool BaulFeedEnabled => false;
        public bool PushDigestEnabled => false;
        public bool TvModeEnabled => false;
        public bool MaintenanceModeEnabled => false;
        public bool AndroidAppBannerEnabled => false;
    }
}
