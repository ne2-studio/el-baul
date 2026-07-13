using System.Security.Claims;
using ElBaul.Ports.Output;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace ElBaul.Infra.Tests;

public class UserSyncMiddlewareTests
{
    private readonly IUserRepository _userRepository = Substitute.For<IUserRepository>();
    private readonly IUserInfoClient _userInfoClient = Substitute.For<IUserInfoClient>();
    private readonly IClock _clock = Substitute.For<IClock>();
    private readonly UserSyncMiddleware _middleware;

    public UserSyncMiddlewareTests()
    {
        _clock.UtcNow().Returns(new DateTime(2026, 7, 13, 0, 0, 0, DateTimeKind.Utc));
        _middleware = new UserSyncMiddleware(_ => Task.CompletedTask);
    }

    private async Task InvokeAsync(HttpContext context) =>
        await _middleware.InvokeAsync(context, _userRepository, _userInfoClient, _clock, Substitute.For<ILogger<UserSyncMiddleware>>());

    private static HttpContext BuildContext(string sub, string? bearerToken = null)
    {
        var identity = new ClaimsIdentity([new Claim("sub", sub)], "TestAuth");
        var context = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };
        if (bearerToken is not null)
        {
            context.Request.Headers.Authorization = $"Bearer {bearerToken}";
        }

        return context;
    }

    [Fact]
    public async Task InvokeAsync_ShouldCreateUser_ViaUserInfoEndpoint_WhenUserIsNew()
    {
        var context = BuildContext("user-1", bearerToken: "the-access-token");
        _userRepository.GetByIdAsync("user-1").Returns((User?)null);
        _userInfoClient.GetUserInfoAsync("the-access-token").Returns(new UserInfo("fetched@test.local", "Fetched Name"));

        await InvokeAsync(context);

        await _userInfoClient.Received(1).GetUserInfoAsync("the-access-token");
        await _userRepository.Received(1).UpsertAsync(Arg.Is<User>(u =>
            u.Id == "user-1" && u.Email == "fetched@test.local" && u.Name == "Fetched Name"));
    }

    [Fact]
    public async Task InvokeAsync_ShouldSkipEntirely_WhenUserAlreadyExists_WithAnEmail()
    {
        var context = BuildContext("user-1", bearerToken: "the-access-token");
        _userRepository.GetByIdAsync("user-1").Returns(new User("user-1", "already@test.local", "Already Synced", DateTime.UtcNow));

        await InvokeAsync(context);

        await _userInfoClient.DidNotReceive().GetUserInfoAsync(Arg.Any<string>());
        await _userRepository.DidNotReceive().UpsertAsync(Arg.Any<User>());
    }

    [Fact]
    public async Task InvokeAsync_ShouldResync_WhenExistingRowHasNoEmail()
    {
        // Covers rows created before the user was ever fully synced (e.g. an earlier
        // userinfo call failed, or the row predates this sync flow) — without this,
        // such a user would never get synced since a row already exists for its "sub".
        var context = BuildContext("user-2", bearerToken: "the-access-token");
        _userRepository.GetByIdAsync("user-2").Returns(new User("user-2", "", null, DateTime.UtcNow));
        _userInfoClient.GetUserInfoAsync("the-access-token").Returns(new UserInfo("resynced@test.local", "Resynced Name"));

        await InvokeAsync(context);

        await _userInfoClient.Received(1).GetUserInfoAsync("the-access-token");
        await _userRepository.Received(1).UpsertAsync(Arg.Is<User>(u =>
            u.Id == "user-2" && u.Email == "resynced@test.local" && u.Name == "Resynced Name"));
    }

    [Fact]
    public async Task InvokeAsync_ShouldSkipSync_WhenUserInfoEndpointReturnsNull()
    {
        var context = BuildContext("user-3", bearerToken: "the-access-token");
        _userRepository.GetByIdAsync("user-3").Returns((User?)null);
        _userInfoClient.GetUserInfoAsync("the-access-token").Returns((UserInfo?)null);

        await InvokeAsync(context);

        await _userRepository.DidNotReceive().UpsertAsync(Arg.Any<User>());
    }

    [Fact]
    public async Task InvokeAsync_ShouldSkipSync_WhenRequestHasNoBearerToken()
    {
        var context = BuildContext("user-4");
        _userRepository.GetByIdAsync("user-4").Returns((User?)null);

        await InvokeAsync(context);

        await _userInfoClient.DidNotReceive().GetUserInfoAsync(Arg.Any<string>());
        await _userRepository.DidNotReceive().UpsertAsync(Arg.Any<User>());
    }

    [Fact]
    public async Task InvokeAsync_ShouldDoNothing_WhenUserIsNotAuthenticated()
    {
        var context = new DefaultHttpContext();

        await InvokeAsync(context);

        await _userRepository.DidNotReceive().GetByIdAsync(Arg.Any<string>());
        await _userRepository.DidNotReceive().UpsertAsync(Arg.Any<User>());
    }
}
