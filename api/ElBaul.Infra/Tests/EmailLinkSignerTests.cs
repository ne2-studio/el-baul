using Microsoft.Extensions.Configuration;

namespace ElBaul.Infra.Tests;

public class EmailLinkSignerTests
{
    private readonly EmailLinkSigner _signer = CreateSigner();

    private static EmailLinkSigner CreateSigner(string key = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899")
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["EmailLinkSigning:Key"] = key })
            .Build();
        return new EmailLinkSigner(configuration);
    }

    [Fact]
    public void CreateToken_ThenTryDecode_ShouldRoundTrip()
    {
        var sentEmailId = Guid.NewGuid();
        var token = _signer.CreateToken(sentEmailId, "primary-cta", "https://app.test/?redirectTo=%2Fbaules%2F1");

        var decoded = _signer.TryDecode(token);

        Assert.NotNull(decoded);
        Assert.Equal(sentEmailId, decoded.SentEmailId);
        Assert.Equal("primary-cta", decoded.LinkKey);
        Assert.Equal("https://app.test/?redirectTo=%2Fbaules%2F1", decoded.DestinationUrl);
    }

    [Fact]
    public void CreateToken_ShouldBeDeterministic_ForTheSameInputs()
    {
        var sentEmailId = Guid.NewGuid();

        var first = _signer.CreateToken(sentEmailId, "primary-cta", "https://app.test/x");
        var second = _signer.CreateToken(sentEmailId, "primary-cta", "https://app.test/x");

        // Determinism is what lets a click row be created lazily and keyed by token: repeat
        // clicks on the same link must map to the same row instead of minting a new one each time.
        Assert.Equal(first, second);
    }

    [Fact]
    public void CreateToken_ShouldDiffer_WhenAnyInputDiffers()
    {
        var sentEmailId = Guid.NewGuid();
        var baseline = _signer.CreateToken(sentEmailId, "primary-cta", "https://app.test/x");

        Assert.NotEqual(baseline, _signer.CreateToken(Guid.NewGuid(), "primary-cta", "https://app.test/x"));
        Assert.NotEqual(baseline, _signer.CreateToken(sentEmailId, "other-key", "https://app.test/x"));
        Assert.NotEqual(baseline, _signer.CreateToken(sentEmailId, "primary-cta", "https://app.test/y"));
    }

    [Fact]
    public void TryDecode_ShouldReturnNull_WhenTheSignatureIsTampered()
    {
        var token = _signer.CreateToken(Guid.NewGuid(), "primary-cta", "https://app.test/x");

        // Flip the second-to-last character rather than the last: base64url encodes the 32-byte
        // signature with a trailing group whose final character has two unused padding bits, so
        // toggling it can decode to the exact same signature bytes and make this test flaky.
        var tampered = token[..^2] + (token[^2] == 'A' ? 'B' : 'A') + token[^1];

        Assert.Null(_signer.TryDecode(tampered));
    }

    [Fact]
    public void TryDecode_ShouldReturnNull_WhenSignedWithADifferentKey()
    {
        var token = _signer.CreateToken(Guid.NewGuid(), "primary-cta", "https://app.test/x");
        var otherSigner = CreateSigner("00112233445566778899aabbccddeeff00112233445566778899aabbccddee");

        Assert.Null(otherSigner.TryDecode(token));
    }

    [Fact]
    public void TryDecode_ShouldReturnNull_ForALegacyGuidToken()
    {
        // Tokens minted before this scheme existed are a bare Guid.NewGuid("N") hex string —
        // no "v1." prefix, no dot — so they must fail decoding cleanly and fall back to the
        // legacy DB-lookup path in EmailTrackingController, not throw.
        Assert.Null(_signer.TryDecode(Guid.NewGuid().ToString("N")));
    }

    [Theory]
    [InlineData("")]
    [InlineData("v1.")]
    [InlineData("v1.no-dot-here")]
    [InlineData("v1.not-base64!.also-not-base64!")]
    public void TryDecode_ShouldReturnNull_ForMalformedTokens(string token)
    {
        Assert.Null(_signer.TryDecode(token));
    }
}
