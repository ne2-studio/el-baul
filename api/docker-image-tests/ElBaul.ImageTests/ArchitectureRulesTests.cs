using System.Runtime.CompilerServices;
using FluentAssertions;

namespace ElBaul.ImageTests;

/// <summary>
/// Self-enforcing guard for this project's one hard rule: it must never gain a compile-time
/// dependency on the backend it's supposed to be testing as an opaque artifact. A
/// ProjectReference to anything under api/ElBaul*/ (or any NuGet package pulling in backend
/// internals) would let these tests quietly become ordinary integration tests running against
/// source rather than acceptance tests running against the built image — this fails loudly,
/// on every `dotnet test` run, the moment that happens, instead of relying on someone
/// noticing in review.
/// </summary>
public class ArchitectureRulesTests
{
    [Fact]
    public void This_project_has_no_ProjectReference_to_anything()
    {
        var csprojPath = Path.Combine(ProjectDirectory(), "ElBaul.ImageTests.csproj");
        File.Exists(csprojPath).Should().BeTrue($"expected to find {csprojPath}");

        var csprojContent = File.ReadAllText(csprojPath);

        csprojContent.Should().NotContain("<ProjectReference",
            "docker-image-tests must only know the built image, its env vars, and its public HTTP contract — " +
            "a ProjectReference would let it compile against backend source, defeating the point of testing " +
            "the image as an opaque artifact. See README.md.");
    }

    [Fact]
    public void This_project_does_not_reference_backend_source_assemblies()
    {
        var backendAssemblyNames = typeof(ArchitectureRulesTests).Assembly
            .GetReferencedAssemblies()
            .Select(a => a.Name ?? string.Empty)
            .Where(name => name.StartsWith("ElBaul.Api") || name.StartsWith("ElBaul.Infra") || name.StartsWith("ElBaul.Maintenance") || name == "ElBaul")
            .ToList();

        backendAssemblyNames.Should().BeEmpty(
            "this test assembly should never end up linked against the backend's own assemblies");
    }

    private static string ProjectDirectory([CallerFilePath] string callerFilePath = "") =>
        Path.GetDirectoryName(callerFilePath)!;
}
