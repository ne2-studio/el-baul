using Xunit.Abstractions;

namespace ElBaul.Tests;

/// <summary>
/// Approval test over ElBaul.Core's cross-feature dependency graph (see DsmGenerator) — the
/// features it's organized into (Bauls/, Photos/, Chapters/, ...), not the InputPorts/
/// OutputPorts/Application/Domain layering ArchitectureTests already enforces within each
/// feature.
///
/// Any new edge, new cyclic group, or a cyclic group gaining a feature changes the snapshot
/// and fails this test until a human reviews the diff and re-approves it (overwrite
/// CoreDependencyGraph.verified.txt with CoreDependencyGraph.received.txt). Only re-approve
/// when the change reduces cycles/deep imports, or the new dependency is deliberate and
/// justified in the commit message — never to silence the test.
/// </summary>
public class DsmApprovalTests(ITestOutputHelper output)
{
    [Fact]
    public Task CoreDependencyGraph() => Verify(DsmGenerator.Generate());

    /// <summary>
    /// Not an assertion — always passes. Prints the human-readable DSM table
    /// (docs/architecture/backend.md's DSM section) to stdout so it can be regenerated on
    /// demand without committing a derived .md file. Run it alone with:
    ///   dotnet test api/ElBaul.slnx --filter FullyQualifiedName~PrintHumanReadableDependencyGraph --logger "console;verbosity=detailed"
    /// </summary>
    [Fact]
    public void PrintHumanReadableDependencyGraph() =>
        output.WriteLine(DsmMarkdownRenderer.Render(DsmGenerator.Generate()));
}
