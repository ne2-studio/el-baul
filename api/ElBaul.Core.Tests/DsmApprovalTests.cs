using System.Runtime.CompilerServices;

namespace ElBaul.Tests;

/// <summary>
/// Approval test over ElBaul.Core's cross-feature dependency graph (see DsmGenerator) — which
/// features (Bauls/, Photos/, Chapters/, ...) depend on which, not the InputPorts/OutputPorts/
/// Application/Domain layering ArchitectureTests already enforces within each feature.
///
/// Any new edge, new cyclic group, or a cyclic group gaining a feature changes the snapshot and
/// fails this test. Review the diff between CoreDsm.snapshot.json and CoreDsm.received.json; if
/// the change reduces cycles/deep imports, or the new dependency is deliberate and justified in
/// the commit message, run `./scripts/dsm approve` — this regenerates both
/// CoreDsm.snapshot.json and docs/architecture/core-dsm.md from the same graph in one step, so
/// they can't drift apart. Never approve just to silence the test.
/// </summary>
public class DsmApprovalTests
{
    private const string UpdateSnapshotEnvironmentVariable = "UPDATE_DSM_SNAPSHOT";

    [Fact]
    public void CoreDependencyGraph_MatchesApprovedSnapshot()
    {
        var repoRoot = RepositoryRoot();
        var snapshotPath = Path.Combine(repoRoot, "api", "ElBaul.Core.Tests", "CoreDsm.snapshot.json");
        var receivedPath = Path.Combine(repoRoot, "api", "ElBaul.Core.Tests", "CoreDsm.received.json");
        var docsPath = Path.Combine(repoRoot, "docs", "architecture", "core-dsm.md");

        var dsm = DsmGenerator.Generate();
        var currentJson = DsmGenerator.ToJson(dsm);

        if (Environment.GetEnvironmentVariable(UpdateSnapshotEnvironmentVariable) == "1")
        {
            File.WriteAllText(snapshotPath, currentJson);
            File.WriteAllText(docsPath, DsmMarkdownRenderer.Render(dsm));
            File.Delete(receivedPath);
            return;
        }

        Assert.True(
            File.Exists(snapshotPath),
            $"Missing DSM snapshot at {snapshotPath}. Run ./scripts/dsm approve after reviewing the generated graph.");

        var approvedJson = File.ReadAllText(snapshotPath);
        if (approvedJson == currentJson)
        {
            File.Delete(receivedPath);
            return;
        }

        File.WriteAllText(receivedPath, currentJson);
        Assert.Fail(
            $"ElBaul.Core's cross-feature dependency graph changed. Review the diff between {snapshotPath} and " +
            $"{receivedPath}; if intentional, run: ./scripts/dsm approve.");
    }

    private static string RepositoryRoot([CallerFilePath] string callerFilePath = "")
    {
        var directory = new DirectoryInfo(Path.GetDirectoryName(callerFilePath)!);

        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "docker-compose.yaml")))
            directory = directory.Parent;

        if (directory is null)
            throw new InvalidOperationException("Cannot locate repository root from test path.");

        return directory.FullName;
    }
}
