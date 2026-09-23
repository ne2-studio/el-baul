using ElBaul.Core.Analytics.Application;
using ElBaul.Tests.Fakes;

namespace ElBaul.Tests;

public class UserSessionManagerTests
{
    private const string UserId = "user-1";

    private readonly InMemoryUserSessionRepository _repository = new();
    private readonly StaticClock _clock = new(new DateTime(2026, 8, 22, 10, 0, 0, DateTimeKind.Utc));
    private readonly StaticIdGenerator _idGenerator = new(Guid.NewGuid());

    private UserSessionManager CreateManager() => new(
        _repository,
        new StaticCurrentUserProvider(UserId),
        new StaticAppConfiguration(),
        _idGenerator,
        _clock);

    [Theory]
    [InlineData("android_native")]
    [InlineData("ios_native")]
    [InlineData("android_browser")]
    [InlineData("ios_browser")]
    [InlineData("desktop_browser")]
    [InlineData("android_pwa")]
    [InlineData("ios_pwa")]
    [InlineData("desktop_pwa")]
    public async Task RecordSessionOpenAsync_ShouldAcceptAllKnownPlatforms(string platform)
    {
        var manager = CreateManager();

        var result = await manager.RecordSessionOpenAsync(platform, "direct");

        Assert.True(result.IsSuccess);
    }

    [Theory]
    [InlineData("email")]
    [InlineData("push")]
    [InlineData("link")]
    [InlineData("direct")]
    public async Task RecordSessionOpenAsync_ShouldAcceptAllKnownEntrySources(string entrySource)
    {
        var manager = CreateManager();

        var result = await manager.RecordSessionOpenAsync("desktop_browser", entrySource);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task RecordSessionOpenAsync_ShouldFail_ForUnknownPlatform()
    {
        var manager = CreateManager();

        var result = await manager.RecordSessionOpenAsync("smart_fridge", "direct");

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task RecordSessionOpenAsync_ShouldFail_ForUnknownEntrySource()
    {
        var manager = CreateManager();

        var result = await manager.RecordSessionOpenAsync("desktop_browser", "utm_campaign");

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task RecordSessionOpenAsync_ShouldRecordSessionWithUserIdAndFunctionalDate()
    {
        var manager = CreateManager();

        var result = await manager.RecordSessionOpenAsync("ios_native", "push");

        Assert.True(result.IsSuccess);
        var session = Assert.Single(_repository.Sessions);
        Assert.Equal(UserId, session.UserId);
        Assert.Equal("ios_native", session.Platform);
        Assert.Equal("push", session.EntrySource);
        // Europe/Madrid (StaticAppConfiguration.FunctionalTimeZoneId) is UTC+2 in August, so
        // 10:00 UTC falls on the same calendar day — see the timezone-boundary test below for
        // the case where it doesn't.
        Assert.Equal(new DateOnly(2026, 8, 22), session.Date);
    }

    [Fact]
    public async Task RecordSessionOpenAsync_ShouldUseFunctionalTimezone_ForDateBoundary()
    {
        // 22:30 UTC is already 00:30 the next day in Europe/Madrid (UTC+2 in August).
        _clock.Now = new DateTime(2026, 8, 21, 22, 30, 0, DateTimeKind.Utc);
        var manager = CreateManager();

        await manager.RecordSessionOpenAsync("android_browser", "direct");

        var session = Assert.Single(_repository.Sessions);
        Assert.Equal(new DateOnly(2026, 8, 22), session.Date);
    }
}
