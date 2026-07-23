using System.Net;
using System.Net.Sockets;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using FluentAssertions;

namespace ElBaul.ImageTests.Smoke;

/// <summary>
/// The bare minimum a deployed image must do to be worth deploying at all: start, stay up,
/// answer its health check, actually listen on the port it claims to, and pick up
/// configuration from environment variables the way every other part of this stack expects
/// it to (docker-compose.yaml, Coolify, `docker run -e ...` all configure it this way — see
/// api/README.md).
/// </summary>
[Collection(ImageTestCollection.Name)]
public class SmokeTests(ElBaulImageFixture fixture)
{
    [Fact]
    public void Image_starts_and_keeps_running()
    {
        fixture.Backend.State.Should().Be(TestcontainersStates.Running);
    }

    [Fact]
    public async Task Health_endpoint_reports_healthy()
    {
        var response = await fixture.BackendClient.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("healthy");
    }

    [Fact]
    public async Task Listens_on_the_expected_container_port()
    {
        var mappedPort = fixture.Backend.GetMappedPublicPort(8080);

        using var tcpClient = new TcpClient();
        var connectTask = tcpClient.ConnectAsync(IPAddress.Loopback, mappedPort);
        var completed = await Task.WhenAny(connectTask, Task.Delay(TimeSpan.FromSeconds(5)));

        completed.Should().Be(connectTask, "the image should accept TCP connections on its published port 8080");
        tcpClient.Connected.Should().BeTrue();
    }

    [Fact]
    public async Task Picks_up_configuration_from_environment_variables()
    {
        // App__PublicUrl was injected only via env var (see ElBaulImageFixture.BackendEnvironment)
        // — no baked-in appsettings.json value matches it — so seeing it echoed back here proves
        // env-var configuration actually reaches the running process, not just that the
        // container starts with *some* config.
        var response = await fixture.BackendClient.GetAsync("/api/app-config");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("image-test.el-baul.invalid");
    }

    [Fact]
    public async Task Rejects_an_unreachable_database_by_failing_fast_with_a_diagnosable_error()
    {
        var backendImage = Environment.GetEnvironmentVariable("BACKEND_IMAGE")
            ?? throw new InvalidOperationException("BACKEND_IMAGE is required");

        var brokenEnvironment = new Dictionary<string, string>(fixture.BackendEnvironment)
        {
            ["ConnectionStrings__DefaultConnection"] =
                "Host=postgres-host-that-does-not-exist;Port=5432;Database=elbaul;Username=imagetest;Password=imagetest"
        };

        var brokenBuilder = new ContainerBuilder(backendImage)
            .WithNetwork(fixture.Network)
            .WithNetworkAliases("backend-broken-config");
        foreach (var (key, value) in brokenEnvironment)
        {
            brokenBuilder = brokenBuilder.WithEnvironment(key, value);
        }

        await using var brokenBackend = brokenBuilder.Build();
        await brokenBackend.StartAsync();

        // GetExitCodeAsync waits for the container to actually stop (like `docker wait`)
        // rather than polling .State, which proved unreliable for a container that crashes
        // within the first couple of seconds of starting — there's no health check to make
        // StartAsync itself wait for readiness here, so by the time control returns from
        // StartAsync the container may already be gone.
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        long exitCode;
        try
        {
            exitCode = await brokenBackend.GetExitCodeAsync(timeout.Token);
        }
        catch (OperationCanceledException)
        {
            throw new Xunit.Sdk.XunitException(
                "a container that can never reach its configured database should exit rather than hang forever pretending to be healthy");
        }

        exitCode.Should().NotBe(0, "an unreachable database should be a startup failure, not a silent success");

        var (stdout, stderr) = await brokenBackend.GetLogsAsync();
        (stdout + stderr).Should().NotBeNullOrWhiteSpace(
            "a startup failure should be diagnosable from container logs, not silent");
    }
}
