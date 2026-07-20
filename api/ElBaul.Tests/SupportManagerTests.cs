using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class SupportManagerTests
{
    private const string UserId = "user-1";

    private readonly InMemoryUserRepository _userRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();

    private SupportManager CreateManager(Guid? nextId = null) =>
        new(NullLogger<SupportManager>.Instance, _userRepository, _photoStorage,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), new StaticCurrentUserProvider(UserId));

    private void SeedUser() =>
        _userRepository.Seed(new User(UserId, "user@example.com", "Usuaria", DateTime.UtcNow));

    [Fact]
    public async Task SubmitAsync_ShouldSucceed_ForValidCategoryAndMessage()
    {
        SeedUser();
        var manager = CreateManager();

        var result = await manager.SubmitAsync("Bug", "Se ha caído la app", "Mozilla/5.0", null, null, null);

        Assert.True(result.IsSuccess);
    }

    [Theory]
    [InlineData("Support")]
    [InlineData("Bug")]
    [InlineData("Suggestion")]
    public async Task SubmitAsync_ShouldAcceptAllKnownCategories(string category)
    {
        SeedUser();
        var manager = CreateManager();

        var result = await manager.SubmitAsync(category, "Mensaje", null, null, null, null);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_ForUnknownCategory()
    {
        SeedUser();
        var manager = CreateManager();

        var result = await manager.SubmitAsync("Marketing", "Mensaje", null, null, null, null);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_ForBlankMessage()
    {
        SeedUser();
        var manager = CreateManager();

        var result = await manager.SubmitAsync("Bug", "   ", null, null, null, null);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_WhenUserNotFound()
    {
        var manager = CreateManager();

        var result = await manager.SubmitAsync("Bug", "Mensaje", null, null, null, null);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task SubmitAsync_ShouldSaveScreenshot_WhenProvided()
    {
        SeedUser();
        var manager = CreateManager();

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.SubmitAsync("Bug", "Mensaje", null, content, "captura.png", "image/png");

        Assert.True(result.IsSuccess);
        Assert.Single(_photoStorage.SavedKeys);
        Assert.Contains(UserId, _photoStorage.SavedKeys[0]);
    }
}
