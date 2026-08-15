using System.Text;

namespace ElBaul.Tests;

/// <summary>
/// Renders a DsmGenerator.Dsm as the human-readable table/summary from
/// docs/architecture/backend.md's DSM section. Not run automatically and nothing here writes
/// to disk — see DsmApprovalTests.PrintHumanReadableDependencyGraph for how to produce it
/// on demand.
/// </summary>
public static class DsmMarkdownRenderer
{
    public static string Render(DsmGenerator.Dsm dsm)
    {
        var sb = new StringBuilder();
        var features = dsm.Features;
        var edgesByPair = dsm.Edges.ToDictionary(e => (e.From, e.To), e => e.Kind);

        sb.AppendLine("## DSM — ElBaul.Core (filas = usa → columnas)");
        sb.AppendLine();
        sb.AppendLine("`●` = deep import (`.Application`/`.OutputPorts` ajeno) · `○` = solo API pública · vacío = sin dependencia");
        sb.AppendLine();
        sb.Append("| ↓usa→ |");
        foreach (var f in features)
            sb.Append($" {f} |");
        sb.AppendLine();
        sb.Append("|---|");
        foreach (var _ in features)
            sb.Append("---|");
        sb.AppendLine();

        foreach (var row in features)
        {
            sb.Append($"| {row} |");
            foreach (var col in features)
            {
                if (row == col)
                {
                    sb.Append(" — |");
                    continue;
                }

                var cell = edgesByPair.TryGetValue((row, col), out var kind)
                    ? kind == DsmGenerator.ImportKind.Deep ? "●" : "○"
                    : "";
                sb.Append($" {cell} |");
            }
            sb.AppendLine();
        }

        sb.AppendLine();
        sb.AppendLine("## Ciclos");
        sb.AppendLine();
        if (dsm.CyclicGroups.Count == 0)
        {
            sb.AppendLine("Ninguno — el grafo de dependencias entre features es acíclico.");
        }
        else
        {
            sb.AppendLine("El grafo NO es acíclico. Grupos fuertemente conexos (SCC) con más de un feature:");
            sb.AppendLine();
            foreach (var group in dsm.CyclicGroups)
                sb.AppendLine($"- {string.Join(", ", group)}");
        }

        return sb.ToString();
    }
}
