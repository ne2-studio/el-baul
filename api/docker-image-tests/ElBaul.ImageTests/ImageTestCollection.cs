namespace ElBaul.ImageTests;

/// <summary>
/// Shares one ElBaulImageFixture (one running Postgres+MinIO+fake-oidc+backend stack) across
/// every test class below — xunit builds it once per collection per test run, not once per
/// class, which matters here since starting four containers and waiting for the backend's
/// migrations to run is the expensive part of each of these tests.
/// </summary>
[CollectionDefinition(Name)]
public class ImageTestCollection : ICollectionFixture<ElBaulImageFixture>
{
    public const string Name = "ElBaul image";
}
