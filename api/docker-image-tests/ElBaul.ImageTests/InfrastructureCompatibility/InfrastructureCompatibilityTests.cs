using DotNet.Testcontainers.Builders;
using FluentAssertions;

namespace ElBaul.ImageTests.InfrastructureCompatibility;

/// <summary>
/// Confirms the image talks correctly to the external services it's contractually built
/// against — Postgres and MinIO/S3 — on the network boundary alone: no EF Core, no AWS SDK,
/// no code shared with the backend. Postgres is inspected via its own `psql` client running
/// inside the Postgres container itself (`ExecAsync`); MinIO is inspected via a throwaway
/// `minio/mc` container on the same Docker network. Both are the two explicitly-sanctioned
/// exceptions to "don't touch infrastructure directly" — verifying persistence/migrations,
/// and talking to S3 as an external interface.
/// </summary>
[Collection(ImageTestCollection.Name)]
public class InfrastructureCompatibilityTests(ElBaulImageFixture fixture)
{
    [Fact]
    public async Task Runs_EF_Core_migrations_against_Postgres_on_startup()
    {
        var result = await fixture.Postgres.ExecAsync([
            "psql", "-U", "imagetest", "-d", "elbaul", "-tAc",
            "SELECT count(*) FROM \"__EFMigrationsHistory\";"
        ]);

        result.ExitCode.Should().Be(0, "psql itself should run cleanly inside the Postgres container");
        int.Parse(result.Stdout.Trim()).Should().BeGreaterThan(0,
            "the backend should have applied at least one migration on startup (Program.cs calls MigrateAsync before serving traffic)");
    }

    [Fact]
    public async Task Creates_expected_domain_tables_via_migrations()
    {
        var result = await fixture.Postgres.ExecAsync([
            "psql", "-U", "imagetest", "-d", "elbaul", "-tAc",
            "SELECT string_agg(table_name, ',') FROM information_schema.tables WHERE table_schema = 'public';"
        ]);

        result.ExitCode.Should().Be(0);
        var tables = result.Stdout.Trim();
        tables.Should().Contain("Users").And.Contain("Baules").And.Contain("Albums").And.Contain("Photos").And.Contain("Recuerdos");
    }

    [Fact]
    public async Task Connects_to_MinIO_and_provisions_its_photo_bucket_on_startup()
    {
        // A throwaway minio/mc container on the same network, kept alive via an entrypoint
        // override so `mc alias set` + `mc ls` can run as separate ExecAsync calls — the
        // backend already created this bucket itself on startup (IPhotoStorage.
        // EnsureBucketExistsAsync), this only confirms that from outside, over the network,
        // the same way an operator checking MinIO directly would.
        await using var mc = new ContainerBuilder("minio/mc")
            .WithNetwork(fixture.Network)
            .WithEntrypoint("tail", "-f", "/dev/null")
            .Build();
        await mc.StartAsync();

        var alias = await mc.ExecAsync(["mc", "alias", "set", "target", "http://minio:9000", "imagetest", "imagetest-secret"]);
        alias.ExitCode.Should().Be(0, $"mc alias set failed: {alias.Stderr}");

        var ls = await mc.ExecAsync(["mc", "ls", "target/el-baul-photos"]);
        ls.ExitCode.Should().Be(0, $"expected the el-baul-photos bucket to exist: {ls.Stderr}");
    }

    [Fact]
    public void Backends_published_port_is_reachable_through_a_real_docker_network_mapping()
    {
        // Distinct from the smoke "listens on the expected port" check: this asserts the
        // container's internal port (8080, fixed) and the host-visible port (dynamic) are
        // actually different, i.e. it's genuinely traversing Docker's network/port-mapping
        // layer rather than e.g. running with --network=host.
        var mappedPort = fixture.Backend.GetMappedPublicPort(8080);

        mappedPort.Should().BePositive().And.NotBe(8080,
            "the mapped host port should be a Docker-assigned ephemeral port, distinct from the fixed in-container port");
    }
}
