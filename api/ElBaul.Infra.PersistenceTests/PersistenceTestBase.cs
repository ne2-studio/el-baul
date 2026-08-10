namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// Resets the shared Postgres database to empty before every test method — xunit constructs a
/// fresh instance of the test class per <c>[Fact]</c>, so <see cref="InitializeAsync"/> runs
/// once per test, not once per class. Inherit from this instead of implementing
/// <c>IAsyncLifetime</c> by hand so no test class can forget to reset and silently end up
/// depending on another test's leftover rows.
///
/// Derived classes must still carry <c>[Collection(PersistenceTestCollection.Name)]</c>
/// themselves (see that class's doc comment) — xunit does not reliably discover a
/// <c>[Collection]</c> attribute placed only on a shared base class.
/// </summary>
public abstract class PersistenceTestBase(PostgresFixture fixture) : IAsyncLifetime
{
    protected PostgresFixture Fixture { get; } = fixture;

    public Task InitializeAsync() => Fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;
}
