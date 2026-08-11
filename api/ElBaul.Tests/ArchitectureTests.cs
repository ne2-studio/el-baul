using ArchUnitNET.Domain;
using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using ArchUnitNET.xUnit;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace ElBaul.Tests;

// Enforces the project-boundary rules from docs/architecture/backend.md's ElBaul core:
// InputPorts and OutputPorts are disjoint from each other — the only things allowed to appear
// on both sides of a port are Domain concepts (ids, BaulRole, PhotoDate, ...) — and Domain is
// the innermost layer, depending on nothing else in the core (InputPorts/OutputPorts/
// Application all depend on it, never the other way round).
public class ArchitectureTests
{
    // TIP: load the architecture once to keep every rule check in this file fast.
    private static readonly Architecture Architecture = new ArchLoader()
        .LoadAssemblies(typeof(ElBaul.Domain.UserId).Assembly)
        .Build();

    private readonly IObjectProvider<IType> InputPorts = Types()
        .That()
        .ResideInNamespaceMatching(@"^ElBaul\.InputPorts(\..*)?$")
        .As("InputPorts");

    private readonly IObjectProvider<IType> OutputPorts = Types()
        .That()
        .ResideInNamespaceMatching(@"^ElBaul\.OutputPorts(\..*)?$")
        .As("OutputPorts");

    private readonly IObjectProvider<IType> Application = Types()
        .That()
        .ResideInNamespaceMatching(@"^ElBaul\.Application(\..*)?$")
        .As("Application");

    private readonly IObjectProvider<IType> Domain = Types()
        .That()
        .ResideInNamespaceMatching(@"^ElBaul\.Domain(\..*)?$")
        .As("Domain");

    [Fact]
    public void InputPorts_ShouldNotDependOn_OutputPorts()
    {
        Types()
            .That()
            .Are(InputPorts)
            .Should()
            .NotDependOnAny(OutputPorts)
            .Because("InputPorts and OutputPorts must stay disjoint — only ElBaul.Domain types may appear on both sides of a port")
            .Check(Architecture);
    }

    [Fact]
    public void OutputPorts_ShouldNotDependOn_InputPorts()
    {
        Types()
            .That()
            .Are(OutputPorts)
            .Should()
            .NotDependOnAny(InputPorts)
            .Because("InputPorts and OutputPorts must stay disjoint — only ElBaul.Domain types may appear on both sides of a port")
            .Check(Architecture);
    }

    [Fact]
    public void Domain_ShouldNotDependOn_InputPorts()
    {
        Types()
            .That()
            .Are(Domain)
            .Should()
            .NotDependOnAny(InputPorts)
            .Because("ElBaul.Domain is the innermost layer — InputPorts depends on it, never the reverse")
            .Check(Architecture);
    }

    [Fact]
    public void Domain_ShouldNotDependOn_OutputPorts()
    {
        Types()
            .That()
            .Are(Domain)
            .Should()
            .NotDependOnAny(OutputPorts)
            .Because("ElBaul.Domain is the innermost layer — OutputPorts depends on it, never the reverse")
            .Check(Architecture);
    }

    [Fact]
    public void Domain_ShouldNotDependOn_Application()
    {
        Types()
            .That()
            .Are(Domain)
            .Should()
            .NotDependOnAny(Application)
            .Because("ElBaul.Domain is the innermost layer — Application depends on it, never the reverse")
            .Check(Architecture);
    }
}
