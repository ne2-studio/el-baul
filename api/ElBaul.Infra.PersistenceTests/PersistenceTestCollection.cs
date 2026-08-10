namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// Every persistence test lives in this one collection so xunit shares a single
/// <see cref="PostgresFixture"/> (one Postgres container, migrated once) across the whole
/// project instead of one per test class — and, just as importantly, runs them all
/// sequentially against that shared container instead of racing writes across parallel
/// collections.
/// </summary>
[CollectionDefinition(Name)]
public class PersistenceTestCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "ElBaul persistence";
}
