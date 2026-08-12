using ElBaul.Infra.Persistence;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Users;
using FluentAssertions;
using Microsoft.Extensions.Configuration;

using ElBaul.Domain;
namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// EmailLinkClicks.Token stores real, signed tokens (IEmailLinkSigner) — self-contained strings
/// that embed the destination URL, not the short plain Guid.NewGuid() tokens the column was
/// originally sized for. ElBaul.Infra.Lite's in-memory fake enforces no column length at all, so
/// only a real Postgres insert can catch the column being too narrow for what EmailLinkSigner
/// actually produces.
/// </summary>
[Collection(PersistenceTestCollection.Name)]
public class EmailLinkClickRepositoryTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    [Fact]
    public async Task RegisterSignedClickAsync_persists_a_token_as_long_as_a_real_signed_redirect_link_produces()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var sentEmails = new SentEmailRepository(dbContext);
        var clicks = new EmailLinkClickRepository(dbContext);

        var user = new User(new UserId("email-link-length-user"), "user@example.com", "Usuario", DateTime.UtcNow);
        await users.UpsertAsync(user);
        var sentEmail = new SentEmail(Guid.NewGuid(), user.Id, EmailType.WeeklyDigest, "Asunto", user.Email,
            "v1", "es", EmailStatus.Sent, "dedup-key-link-length", DateTime.UtcNow);
        await sentEmails.TryReserveAsync(sentEmail);

        var signer = new EmailLinkSigner(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["EmailLinkSigning:Key"] = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899"
            })
            .Build());
        var destinationUrl = "http://localhost:3000/?redirectTo=" + Uri.EscapeDataString($"/baules/{Guid.NewGuid()}");
        var token = signer.CreateToken(sentEmail.Id, "primary-cta", destinationUrl);
        var clickedAt = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);

        // This is exactly what EmailTrackingController.Click does for a real digest-email
        // link click; it must not throw "value too long for type character varying(64)".
        var act = async () => await clicks.RegisterSignedClickAsync(
            token, sentEmail.Id, "primary-cta", destinationUrl, clickedAt);
        await act.Should().NotThrowAsync();

        var stored = await clicks.GetByTokenAsync(token);
        stored.Should().NotBeNull();
        stored.DestinationUrl.Should().Be(destinationUrl);
        stored.ClickCount.Should().Be(1);
    }
}
