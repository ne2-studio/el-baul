namespace ElBaul.InputPorts.Personas;
// Display-only shape for the personas tagged in a photo — deliberately not the full
// PersonaDto (that needs a User? lookup and a canEdit computation PhotoManager has no
// business knowing about).
public record TaggedPersonaDto(string Id, string Nickname, string? Name, string? AvatarUrl);
