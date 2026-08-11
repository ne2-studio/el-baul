using CSharpFunctionalExtensions;
using ElBaul.Application.Notifications;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Users;
using ElBaul.Shared;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using NSubstitute;

namespace ElBaul.Tests;

public class PushNotificationManagerTests
{
    private const string UserId = "user-1";
    private const string OtherUserId = "user-2";
    private static readonly Guid GeneratedTokenId = Guid.NewGuid();

    private readonly InMemoryPushTokenRepository _pushTokenRepository = new();
    private readonly FakePushNotificationSender _sender = new();

    private PushNotificationManager CreateManager(string currentUserId = UserId) => new(
        _pushTokenRepository, _sender, new StaticCurrentUserProvider(currentUserId),
        new StaticIdGenerator(GeneratedTokenId), new StaticClock());

    [Fact]
    public async Task RegisterTokenAsync_ShouldUpsertAToken_ScopedToTheCurrentUser()
    {
        var manager = CreateManager();

        var result = await manager.RegisterTokenAsync("device-token", "android");

        Assert.True(result.IsSuccess);
        var tokens = await _pushTokenRepository.GetTokensForUserAsync(UserId);
        var token = Assert.Single(tokens);
        Assert.Equal("device-token", token.Token);
        Assert.Equal("android", token.Platform);
        Assert.Equal(UserId, token.UserId);
    }

    [Fact]
    public async Task RegisterTokenAsync_ShouldMoveOwnership_WhenTheSameTokenWasRegisteredByAnotherUser()
    {
        await CreateManager(OtherUserId).RegisterTokenAsync("device-token", "android");

        var result = await CreateManager(UserId).RegisterTokenAsync("device-token", "ios");

        Assert.True(result.IsSuccess);
        Assert.Empty(await _pushTokenRepository.GetTokensForUserAsync(OtherUserId));
        var token = Assert.Single(await _pushTokenRepository.GetTokensForUserAsync(UserId));
        Assert.Equal("ios", token.Platform);
    }

    [Fact]
    public async Task UnregisterTokenAsync_ShouldDeleteTheCallersToken()
    {
        await CreateManager(UserId).RegisterTokenAsync("device-token", "android");

        var result = await CreateManager(UserId).UnregisterTokenAsync("device-token");

        Assert.True(result.IsSuccess);
        Assert.Empty(await _pushTokenRepository.GetTokensForUserAsync(UserId));
    }

    [Fact]
    public async Task UnregisterTokenAsync_ShouldNotDeleteAnotherUsersToken()
    {
        await CreateManager(OtherUserId).RegisterTokenAsync("device-token", "android");

        var result = await CreateManager(UserId).UnregisterTokenAsync("device-token");

        Assert.True(result.IsSuccess);
        Assert.Single(await _pushTokenRepository.GetTokensForUserAsync(OtherUserId));
    }

    [Fact]
    public async Task SendTestNotificationAsync_ShouldFail_WhenTheTargetUserHasNoRegisteredDevice()
    {
        var manager = CreateManager();

        var result = await manager.SendTestNotificationAsync(new UserId(UserId), "hola", deepLink: null);

        Assert.True(result.IsFailure);
        Assert.Equal("This user has no registered device", result.Error.Message);
        Assert.Empty(_sender.SentMessages);
    }

    [Fact]
    public async Task SendTestNotificationAsync_ShouldSendToEveryRegisteredDevice()
    {
        var manager = CreateManager();
        await manager.RegisterTokenAsync("token-a", "android");
        await manager.RegisterTokenAsync("token-b", "ios");

        var result = await manager.SendTestNotificationAsync(new UserId(UserId), "hola", "elbaul://home");

        Assert.True(result.IsSuccess);
        Assert.Equal(2, _sender.SentMessages.Count);
        Assert.Contains(_sender.SentMessages, m => m.Token == "token-a");
        Assert.Contains(_sender.SentMessages, m => m.Token == "token-b");
        Assert.All(_sender.SentMessages, m => Assert.Equal("elbaul://home", m.DeepLink));
    }

    [Fact]
    public async Task SendTestNotificationAsync_ShouldStopAtTheFirstFailedSend_WithoutTryingTheRemainingDevices()
    {
        // Documents the current behaviour: a failure on any one device's send aborts the loop
        // instead of continuing to the caller's other devices — a future change to "best effort,
        // report which devices failed" would need to update this expectation deliberately.
        var setupManager = CreateManager();
        await setupManager.RegisterTokenAsync("token-a", "android");
        await setupManager.RegisterTokenAsync("token-b", "ios");
        await setupManager.RegisterTokenAsync("token-c", "android");
        var sender = Substitute.For<IPushNotificationSender>();
        sender.SendAsync(Arg.Any<PushNotificationMessage>())
            .Returns(CSharpFunctionalExtensions.Result.Success(), CSharpFunctionalExtensions.Result.Failure("device unreachable"));
        var manager = new PushNotificationManager(
            _pushTokenRepository, sender, new StaticCurrentUserProvider(UserId),
            new StaticIdGenerator(GeneratedTokenId), new StaticClock());

        var result = await manager.SendTestNotificationAsync(new UserId(UserId), "hola", deepLink: null);

        Assert.True(result.IsFailure);
        await sender.Received(2).SendAsync(Arg.Any<PushNotificationMessage>());
    }
}
