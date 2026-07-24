using CSharpFunctionalExtensions;
using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class SupportManagerTests
{
    private const string UserId = "user-1";

    private readonly InMemoryUserRepository _userRepository = new();
    private readonly FakeSupportBackend _supportBackend = new();

    private SupportManager CreateManager() =>
        new(NullLogger<SupportManager>.Instance, _userRepository, _supportBackend, new StaticCurrentUserProvider(UserId));

    private void SeedUser() =>
        _userRepository.Seed(new User(UserId, "user@example.com", "Usuaria", DateTime.UtcNow));

    [Fact]
    public async Task SubmitAsync_ShouldSucceed_ForValidCategoryAndMessage()
    {
        SeedUser();
        var manager = CreateManager();

        var result = await manager.SubmitAsync("Bug", "Se ha caído la app", "Mozilla/5.0");

        Assert.True(result.IsSuccess);
    }

    [Theory]
    [InlineData("Support")]
    [InlineData("Bug")]
    [InlineData("Suggestion")]
    [InlineData("BaulDeletion")]
    public async Task SubmitAsync_ShouldAcceptAllKnownCategories(string category)
    {
        SeedUser();
        var manager = CreateManager();

        var result = await manager.SubmitAsync(category, "Mensaje", null);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_ForUnknownCategory()
    {
        SeedUser();
        var manager = CreateManager();

        var result = await manager.SubmitAsync("Marketing", "Mensaje", null);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_ForBlankMessage()
    {
        SeedUser();
        var manager = CreateManager();

        var result = await manager.SubmitAsync("Bug", "   ", null);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_WhenUserNotFound()
    {
        var manager = CreateManager();

        var result = await manager.SubmitAsync("Bug", "Mensaje", null);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task SubmitAsync_ShouldForwardSubmissionToBackend()
    {
        SeedUser();
        var manager = CreateManager();

        var result = await manager.SubmitAsync("Bug", "Mensaje", "Mozilla/5.0");

        Assert.True(result.IsSuccess);
        var submission = Assert.Single(_supportBackend.Submissions);
        Assert.Equal("Bug", submission.Category);
        Assert.Equal("Mensaje", submission.Message);
        Assert.Equal("Mozilla/5.0", submission.TechnicalInfo);
        Assert.Equal(UserId, submission.UserId);
        Assert.Equal("user@example.com", submission.UserEmail);
        Assert.Equal("Usuaria", submission.UserName);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_WhenBackendFails()
    {
        SeedUser();
        var manager = CreateManager();
        _supportBackend.NextResult = Result.Failure("boom");

        var result = await manager.SubmitAsync("Bug", "Mensaje", null);

        Assert.True(result.IsFailure);
    }
}
