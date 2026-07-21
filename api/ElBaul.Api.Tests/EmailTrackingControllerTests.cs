using ElBaul.Api.Controllers;
using ElBaul.Ports.Output;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;

namespace ElBaul.Api.Tests;

public class EmailTrackingControllerTests
{
    private readonly IEmailLinkClickRepository _clickRepository = Substitute.For<IEmailLinkClickRepository>();
    private readonly IClock _clock = Substitute.For<IClock>();
    private readonly EmailTrackingController _controller;

    public EmailTrackingControllerTests()
    {
        _clock.UtcNow().Returns(new DateTime(2026, 7, 21, 12, 0, 0, DateTimeKind.Utc));
        _controller = new EmailTrackingController(_clickRepository, _clock);
    }

    [Fact]
    public async Task Click_ShouldRedirectToTheStoredDestination_ForAKnownToken()
    {
        var link = new EmailLinkClick("tok123", Guid.NewGuid(), "primary-cta", "https://app.test/?redirectTo=%2Fbaules%2F1", DateTime.UtcNow);
        _clickRepository.GetByTokenAsync("tok123").Returns(link);

        var result = await _controller.Click("tok123");

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Equal("https://app.test/?redirectTo=%2Fbaules%2F1", redirect.Url);
        await _clickRepository.Received(1).RegisterClickAsync("tok123", _clock.UtcNow());
    }

    [Fact]
    public async Task Click_ShouldReturnNotFound_ForAnUnknownToken_WithoutRedirectingAnywhere()
    {
        _clickRepository.GetByTokenAsync("missing").Returns((EmailLinkClick?)null);

        var result = await _controller.Click("missing");

        Assert.IsType<NotFoundResult>(result);
        await _clickRepository.DidNotReceive().RegisterClickAsync(Arg.Any<string>(), Arg.Any<DateTime>());
    }
}
