namespace ElBaul.Api.Models;

// Role is optional — callers that don't pass one (e.g. "Invitar a la familia") default to
// Colaborador server-side, see IPersonaManager.CreatePersonaAsync.
public record CreatePersonaRequest(string Nickname, string? Role = null);
