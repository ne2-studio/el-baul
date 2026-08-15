using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace ElBaul.Tests;

/// <summary>
/// Regex-based scanner over ElBaul.Core's source that builds a cross-feature dependency graph
/// (which feature imports which other feature's Application/OutputPorts/public root
/// namespace) and finds cyclic groups (strongly connected components with more than one
/// feature). Deliberately simple: parses `namespace` and `using ElBaul.Core.X(.Application|
/// .OutputPorts)?;` lines with regex instead of a real Roslyn compilation — matches this
/// codebase's actual style (one namespace per file, no global usings, no in-place
/// fully-qualified references), so it's a fast, dependency-free approximation, not a fully
/// sound analysis. If ElBaul.Core ever adopts global usings or FQN-in-place references, this
/// will silently under-count edges. See DsmApprovalTests, which snapshots this graph so any
/// change (new edge, new/larger cycle) needs deliberate human re-approval.
/// </summary>
public static class DsmGenerator
{
    public enum ImportKind { Public, Deep }

    public sealed record Edge(string From, string To, ImportKind Kind);

    public sealed record Dsm(
        IReadOnlyList<string> Features,
        IReadOnlyList<Edge> Edges,
        IReadOnlyList<IReadOnlyList<string>> CyclicGroups);

    private static readonly Regex NamespaceRegex = new(@"namespace\s+ElBaul\.Core\.([A-Za-z][A-Za-z0-9]*)", RegexOptions.Compiled);
    private static readonly Regex UsingRegex = new(@"using\s+ElBaul\.Core\.([A-Za-z][A-Za-z0-9]*)(\.(Application|OutputPorts))?\s*;", RegexOptions.Compiled);

    private static readonly string CoreSourceRoot = ResolveCoreSourceRoot();

    public static Dsm Generate()
    {
        var files = Directory.EnumerateFiles(CoreSourceRoot, "*.cs", SearchOption.AllDirectories)
            .Where(f => !IsBuildOutput(f));

        // (from, to) -> strongest kind seen (Deep wins over Public if both occur)
        var edgeKinds = new Dictionary<(string From, string To), ImportKind>();
        var features = new SortedSet<string>();

        foreach (var file in files)
        {
            var text = File.ReadAllText(file);
            var nsMatch = NamespaceRegex.Match(text);
            if (!nsMatch.Success)
                continue;

            var srcFeature = nsMatch.Groups[1].Value;
            features.Add(srcFeature);

            foreach (Match m in UsingRegex.Matches(text))
            {
                var dstFeature = m.Groups[1].Value;
                if (dstFeature == srcFeature)
                    continue;

                var kind = m.Groups[2].Success ? ImportKind.Deep : ImportKind.Public;
                var key = (srcFeature, dstFeature);
                if (!edgeKinds.TryGetValue(key, out var existing) || (existing == ImportKind.Public && kind == ImportKind.Deep))
                    edgeKinds[key] = kind;
            }
        }

        var edges = edgeKinds
            .Select(kv => new Edge(kv.Key.From, kv.Key.To, kv.Value))
            .OrderBy(e => e.From, StringComparer.Ordinal)
            .ThenBy(e => e.To, StringComparer.Ordinal)
            .ToList();

        var cyclicGroups = FindCyclicGroups(features, edges);

        return new Dsm(features.ToList(), edges, cyclicGroups);
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() },
    };

    // Canonical, deterministic serialization — this is the exact text the approved snapshot
    // and the received (mismatch) file are compared/written as, so keep it stable.
    public static string ToJson(Dsm dsm) => JsonSerializer.Serialize(dsm, JsonOptions);

    // Tarjan's SCC algorithm; only groups with more than one feature represent a real cycle.
    private static IReadOnlyList<IReadOnlyList<string>> FindCyclicGroups(IEnumerable<string> features, IReadOnlyList<Edge> edges)
    {
        var graph = edges
            .GroupBy(e => e.From)
            .ToDictionary(g => g.Key, g => g.Select(e => e.To).Distinct().ToList());

        var index = new Dictionary<string, int>();
        var lowlink = new Dictionary<string, int>();
        var onStack = new HashSet<string>();
        var stack = new Stack<string>();
        var groups = new List<List<string>>();
        var counter = 0;

        void StrongConnect(string v)
        {
            index[v] = counter;
            lowlink[v] = counter;
            counter++;
            stack.Push(v);
            onStack.Add(v);

            foreach (var w in graph.GetValueOrDefault(v, []))
            {
                if (!index.ContainsKey(w))
                {
                    StrongConnect(w);
                    lowlink[v] = Math.Min(lowlink[v], lowlink[w]);
                }
                else if (onStack.Contains(w))
                {
                    lowlink[v] = Math.Min(lowlink[v], index[w]);
                }
            }

            if (lowlink[v] == index[v])
            {
                var group = new List<string>();
                string w;
                do
                {
                    w = stack.Pop();
                    onStack.Remove(w);
                    group.Add(w);
                } while (w != v);
                groups.Add(group);
            }
        }

        foreach (var feature in features)
        {
            if (!index.ContainsKey(feature))
                StrongConnect(feature);
        }

        return groups
            .Where(g => g.Count > 1)
            .Select(g => (IReadOnlyList<string>)g.OrderBy(f => f, StringComparer.Ordinal).ToList())
            .OrderBy(g => g[0], StringComparer.Ordinal)
            .ToList();
    }

    private static bool IsBuildOutput(string path)
    {
        var segments = path.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        return segments.Contains("bin") || segments.Contains("obj");
    }

    // Resolves ElBaul.Core's source directory relative to this file rather than the process's
    // working directory or build output, so it works regardless of where `dotnet test` runs from.
    private static string ResolveCoreSourceRoot([CallerFilePath] string here = "")
    {
        var testsProjectDir = Path.GetDirectoryName(here)!;
        var coreProjectDir = Path.GetFullPath(Path.Combine(testsProjectDir, "..", "ElBaul.Core"));
        if (!Directory.Exists(coreProjectDir))
            throw new DirectoryNotFoundException($"Expected ElBaul.Core next to ElBaul.Core.Tests, not found at {coreProjectDir}");

        return coreProjectDir;
    }
}
