using ElBaul.Application.Users;
using ElBaul.OutputPorts.Users;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class UserManagerTests
{
    private const string UserId = "user-1";

    private readonly InMemoryUserRepository _userRepository = new();

    private UserManager CreateManager() => new(_userRepository, new StaticCurrentUserProvider(UserId));

    private void SeedUser(bool weeklyDigestEnabled = true) =>
        _userRepository.Seed(new User(new UserId(UserId), "user@example.com", "Usuaria", DateTime.UtcNow, WeeklyDigestEnabled: weeklyDigestEnabled));

    [Fact]
    public async Task GetCurrentProfileAsync_ShouldIncludeWeeklyDigestEnabled()
    {
        SeedUser(weeklyDigestEnabled: false);
        var manager = CreateManager();

        var result = await manager.GetCurrentProfileAsync();

        Assert.True(result.IsSuccess);
        Assert.False(result.Value.WeeklyDigestEnabled);
    }

    [Fact]
    public async Task UpdateNotificationPreferencesAsync_ShouldPersistAndReturnTheNewValue()
    {
        SeedUser(weeklyDigestEnabled: true);
        var manager = CreateManager();

        var result = await manager.UpdateNotificationPreferencesAsync(false);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value.WeeklyDigestEnabled);

        var persisted = await _userRepository.GetByIdAsync(new UserId(UserId));
        Assert.False(persisted!.WeeklyDigestEnabled);
    }

    [Fact]
    public async Task UpdateNotificationPreferencesAsync_ShouldFail_WhenUserDoesNotExist()
    {
        var manager = CreateManager();

        var result = await manager.UpdateNotificationPreferencesAsync(false);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task MarkOnboardingSeenAsync_ShouldPersistAndReturnTrue()
    {
        SeedUser();
        var manager = CreateManager();

        var result = await manager.MarkOnboardingSeenAsync();

        Assert.True(result.IsSuccess);
        Assert.True(result.Value.HasSeenOnboarding);

        var persisted = await _userRepository.GetByIdAsync(new UserId(UserId));
        Assert.True(persisted!.HasSeenOnboarding);
    }

    [Fact]
    public async Task MarkOnboardingSeenAsync_ShouldFail_WhenUserDoesNotExist()
    {
        var manager = CreateManager();

        var result = await manager.MarkOnboardingSeenAsync();

        Assert.True(result.IsFailure);
    }
}
