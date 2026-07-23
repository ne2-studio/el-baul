using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Networks;

namespace ElBaul.ImageTests;

/// <summary>
/// Boots the same shape of stack docker-compose.yaml gives local dev — Postgres, MinIO,
/// fake-oidc, and the backend image under test — on an isolated Docker network, entirely
/// through their public images/ports/env vars. Shared by every test class in the
/// <see cref="ImageTestCollection"/> collection: one stack per test run, not per test, since
/// the backend genuinely cannot start without a reachable Postgres and MinIO (it runs
/// migrations and a bucket-existence check before it starts serving — see Program.cs — so
/// there is no lighter-weight "smoke only" environment to fall back to).
///
/// This fixture never references anything under api/ElBaul*/ — it only knows public image
/// names, ports, and environment variable contracts, exactly like an operator standing up
/// this stack from the outside would. See ../README.md for the full rule set.
/// </summary>
public sealed class ElBaulImageFixture : IAsyncLifetime
{
    private const string PostgresUser = "imagetest";
    private const string PostgresPassword = "imagetest";
    private const string PostgresDatabase = "elbaul";
    private const string MinioAccessKey = "imagetest";
    private const string MinioSecretKey = "imagetest-secret";
    private const string MinioBucketName = "el-baul-photos";
    public const string OidcClientId = "el-baul-app";
    public const string OidcAdminUserKey = "admin";
    public const string OidcAdminSub = "admin-user";
    public const string OidcRedirectUri = "https://image-test.el-baul.invalid/callback";

    public INetwork Network { get; private set; } = null!;
    public IContainer Postgres { get; private set; } = null!;
    public IContainer Minio { get; private set; } = null!;
    public IContainer FakeOidc { get; private set; } = null!;
    public IContainer Backend { get; private set; } = null!;

    public HttpClient BackendClient { get; private set; } = null!;
    public HttpClient FakeOidcClient { get; private set; } = null!;

    /// <summary>
    /// The full set of env vars the backend needs to reach the sibling containers on
    /// <see cref="Network"/> by their network alias — reused as-is by
    /// InfrastructureCompatibilityTests when it needs to start its own extra backend
    /// container (e.g. with one variable deliberately broken) against the same stack.
    /// </summary>
    public Dictionary<string, string> BackendEnvironment => new()
    {
        ["ASPNETCORE_ENVIRONMENT"] = "Testing",
        ["ConnectionStrings__DefaultConnection"] =
            $"Host=postgres;Port=5432;Database={PostgresDatabase};Username={PostgresUser};Password={PostgresPassword}",
        ["Auth__JwksUri"] = "http://fake-oidc:5000/.well-known/jwks.json",
        ["Auth__ValidIssuer"] = "http://fake-oidc:5000",
        ["Auth__Audience"] = OidcClientId,
        ["Auth__UserInfoEndpoint"] = "http://fake-oidc:5000/oidc/v1/userinfo",
        ["Storage__Endpoint"] = "http://minio:9000",
        ["Storage__AccessKey"] = MinioAccessKey,
        ["Storage__SecretKey"] = MinioSecretKey,
        ["Storage__BucketName"] = MinioBucketName,
        // Observable from the outside via GET /api/app-config's "appUrl" — used by
        // SmokeTests to prove env vars actually reach the running process, not just that
        // the container starts.
        ["App__PublicUrl"] = "https://image-test.el-baul.invalid",
    };

    public async Task InitializeAsync()
    {
        var backendImage = Environment.GetEnvironmentVariable("BACKEND_IMAGE")
            ?? throw new InvalidOperationException(
                "BACKEND_IMAGE is required — point it at the image under test, " +
                "e.g. BACKEND_IMAGE=ghcr.io/ne2-studio/el-baul-api:latest");

        Network = new NetworkBuilder().Build();
        await Network.CreateAsync();

        Postgres = new ContainerBuilder("postgres:16")
            .WithNetwork(Network)
            .WithNetworkAliases("postgres")
            .WithEnvironment("POSTGRES_USER", PostgresUser)
            .WithEnvironment("POSTGRES_PASSWORD", PostgresPassword)
            .WithEnvironment("POSTGRES_DB", PostgresDatabase)
            .WithWaitStrategy(Wait.ForUnixContainer().UntilCommandIsCompleted(
                "pg_isready", "-U", PostgresUser, "-d", PostgresDatabase))
            .Build();

        Minio = new ContainerBuilder("minio/minio")
            .WithNetwork(Network)
            .WithNetworkAliases("minio")
            .WithPortBinding(9000, true)
            .WithEnvironment("MINIO_ROOT_USER", MinioAccessKey)
            .WithEnvironment("MINIO_ROOT_PASSWORD", MinioSecretKey)
            .WithCommand("server", "/data")
            .WithWaitStrategy(Wait.ForUnixContainer().UntilHttpRequestIsSucceeded(r => r
                .ForPort(9000)
                .ForPath("/minio/health/live")))
            .Build();

        FakeOidc = new ContainerBuilder("ghcr.io/ne2-studio/fake-oidc:latest")
            .WithNetwork(Network)
            .WithNetworkAliases("fake-oidc")
            .WithPortBinding(5000, true)
            .WithEnvironment("OIDC_ISSUER", "http://fake-oidc:5000")
            .WithEnvironment("OIDC_CLIENTS", $$"""[{"clientId":"{{OidcClientId}}","redirectUris":["{{OidcRedirectUri}}"]}]""")
            .WithEnvironment("OIDC_USERS", $$"""[{"key":"{{OidcAdminUserKey}}","sub":"{{OidcAdminSub}}","email":"admin@image-test.el-baul.invalid","name":"Image Test Admin","roles":["admin"]}]""")
            .WithWaitStrategy(Wait.ForUnixContainer().UntilHttpRequestIsSucceeded(r => r
                .ForPort(5000)
                .ForPath("/health")))
            .Build();

        await Task.WhenAll(Postgres.StartAsync(), Minio.StartAsync(), FakeOidc.StartAsync());

        var backendBuilder = new ContainerBuilder(backendImage)
            .WithNetwork(Network)
            .WithNetworkAliases("backend")
            .WithPortBinding(8080, true)
            .WithWaitStrategy(Wait.ForUnixContainer().UntilHttpRequestIsSucceeded(r => r
                .ForPort(8080)
                .ForPath("/health")));
        foreach (var (key, value) in BackendEnvironment)
        {
            backendBuilder = backendBuilder.WithEnvironment(key, value);
        }
        Backend = backendBuilder.Build();

        await Backend.StartAsync();

        BackendClient = new HttpClient
        {
            BaseAddress = new Uri($"http://localhost:{Backend.GetMappedPublicPort(8080)}")
        };
        FakeOidcClient = new HttpClient
        {
            BaseAddress = new Uri($"http://localhost:{FakeOidc.GetMappedPublicPort(5000)}")
        };
    }

    public FakeOidcTokenClient CreateOidcTokenClient() => new(FakeOidcClient.BaseAddress!);

    public async Task DisposeAsync()
    {
        BackendClient.Dispose();
        FakeOidcClient.Dispose();

        // Containers hold a reference to Network, so they must stop before it's disposed.
        await Backend.DisposeAsync();
        await Task.WhenAll(Postgres.DisposeAsync().AsTask(), Minio.DisposeAsync().AsTask(), FakeOidc.DisposeAsync().AsTask());
        await Network.DisposeAsync();
    }
}
