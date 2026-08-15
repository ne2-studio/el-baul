using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Personas;
using ElBaul.Domain;
namespace ElBaul.OutputPorts.Admin;
/// <summary>
/// The backoffice baúl detail screen. Personas doubles as both "miembros" and "personas"
/// from the PRD — they're the same rows (Persona.Id is already the PersonId the
/// invitation flow keys off of), so there's no separate query for each.
/// LinkedUserNames maps a Persona's UserId to a display name/email, for the Personas
/// that have a linked account — avoids an N+1 user lookup per persona row.
/// </summary>
public record AdminBaulDetailRow(
    Baul Baul,
    IEnumerable<Persona> Personas,
    IReadOnlyDictionary<UserId, string> LinkedUserNames,
    IEnumerable<Chapter> Chapters,
    int PhotoCount,
    int RecuerdoCount,
    long TotalSizeBytes
);
