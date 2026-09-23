using Microsoft.Extensions.Configuration;

namespace ElBaul.Infra.Tests;

public class PushLinkSignerTests
{
    private readonly PushLinkSigner _signer = CreateSigner();

    private static PushLinkSigner CreateSigner(string key = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899")
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["EmailLinkSigning:Key"] = key })
            .Build();
        return new PushLinkSigner(configuration);
    }

    [Fact]
    public void CreateOpenToken_ThenTryDecodeOpenToken_ShouldRoundTrip()
    {
        var sentPushNotificationId = Guid.NewGuid();
        var token = _signer.CreateOpenToken(sentPushNotificationId);

        Assert.Equal(sentPushNotificationId, _signer.TryDecodeOpenToken(token));
    }

    [Fact]
    public void TryDecodeOpenToken_ShouldReturnNull_WhenTheSignatureIsTampered()
    {
        var token = _signer.CreateOpenToken(Guid.NewGuid());

        // See EmailLinkSignerTests for why the second-to-last character, not the last.
        var tampered = token[..^2] + (token[^2] == 'A' ? 'B' : 'A') + token[^1];

        Assert.Null(_signer.TryDecodeOpenToken(tampered));
    }

    [Fact]
    public void TryDecodeOpenToken_ShouldReturnNull_WhenSignedWithADifferentKey()
    {
        var token = _signer.CreateOpenToken(Guid.NewGuid());
        var otherSigner = CreateSigner("00112233445566778899aabbccddeeff00112233445566778899aabbccddee");

        Assert.Null(otherSigner.TryDecodeOpenToken(token));
    }

    [Fact]
    public void TryDecodeOpenToken_ShouldReturnNull_ForAnEmailOpenToken()
    {
        // The "po1." prefix must never accept an "o1." (email) token, even signed with the same key.
        var emailSigner = new EmailLinkSigner(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["EmailLinkSigning:Key"] = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899"
            })
            .Build());
        var emailToken = emailSigner.CreateOpenToken(Guid.NewGuid());

        Assert.Null(_signer.TryDecodeOpenToken(emailToken));
    }

    [Theory]
    [InlineData("")]
    [InlineData("po1.")]
    [InlineData("po1.no-dot-here")]
    [InlineData("po1.not-base64!.also-not-base64!")]
    public void TryDecodeOpenToken_ShouldReturnNull_ForMalformedTokens(string token)
    {
        Assert.Null(_signer.TryDecodeOpenToken(token));
    }
}
