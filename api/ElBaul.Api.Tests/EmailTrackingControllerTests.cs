using ElBaul.Api.Controllers;
using ElBaul.OutputPorts.Notifications;
using ElBaul.Shared;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;

namespace ElBaul.Api.Tests;

public class EmailTrackingControllerTests
{
    private readonly IEmailLinkClickRepository _clickRepository = Substitute.For<IEmailLinkClickRepository>();
    private readonly IEmailLinkSigner _emailLinkSigner = Substitute.For<IEmailLinkSigner>();
    private readonly IClock _clock = Substitute.For<IClock>();
    private readonly EmailTrackingController _controller;

    public EmailTrackingControllerTests()
    {
        _clock.UtcNow().Returns(new DateTime(2026, 7, 21, 12, 0, 0, DateTimeKind.Utc));
        _controller = new EmailTrackingController(_clickRepository, _emailLinkSigner, _clock);
    }

    [Fact]
    public async Task Click_ShouldRedirectToTheEmbeddedDestination_ForASelfContainedSignedToken()
    {
        var sentEmailId = Guid.NewGuid();
        var payload = new EmailLinkTokenPayload(sentEmailId, "primary-cta", "https://app.test/?redirectTo=%2Fbaules%2F1");
        _emailLinkSigner.TryDecode("v1.tok").Returns(payload);

        var result = await _controller.Click("v1.tok");

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Equal("https://app.test/?redirectTo=%2Fbaules%2F1", redirect.Url);
        await _clickRepository.Received(1).RegisterSignedClickAsync(
            "v1.tok", sentEmailId, "primary-cta", "https://app.test/?redirectTo=%2Fbaules%2F1", _clock.UtcNow());

        // Signed tokens never need the legacy DB-lookup path.
        await _clickRepository.DidNotReceive().GetByTokenAsync(Arg.Any<string>());
        await _clickRepository.DidNotReceive().RegisterClickAsync(Arg.Any<string>(), Arg.Any<DateTime>());
    }

    [Fact]
    public async Task Click_ShouldFallBackToTheLegacyLookup_WhenTheTokenIsNotASignedToken()
    {
        // Tokens minted before self-contained signed tokens existed (plain Guid.NewGuid()) fail
        // TryDecode and must keep resolving via the pre-existing EmailLinkClicks row.
        _emailLinkSigner.TryDecode("tok123").Returns((EmailLinkTokenPayload?)null);
        var link = new EmailLinkClick("tok123", Guid.NewGuid(), "primary-cta", "https://app.test/?redirectTo=%2Fbaules%2F1", DateTime.UtcNow);
        _clickRepository.GetByTokenAsync("tok123").Returns(link);

        var result = await _controller.Click("tok123");

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Equal("https://app.test/?redirectTo=%2Fbaules%2F1", redirect.Url);
        await _clickRepository.Received(1).RegisterClickAsync("tok123", _clock.UtcNow());
    }

    [Fact]
    public async Task Click_ShouldReturnNotFound_ForAnUnknownLegacyToken_WithoutRedirectingAnywhere()
    {
        _emailLinkSigner.TryDecode("missing").Returns((EmailLinkTokenPayload?)null);
        _clickRepository.GetByTokenAsync("missing").Returns((EmailLinkClick?)null);

        var result = await _controller.Click("missing");

        Assert.IsType<NotFoundResult>(result);
        await _clickRepository.DidNotReceive().RegisterClickAsync(Arg.Any<string>(), Arg.Any<DateTime>());
    }
}
