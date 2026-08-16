using ElBaul.Core.Photos;
namespace ElBaul.Core.Contributions;

// "Type" viaja en minúsculas (ver ContributionSuggestionType) para que el cliente lo use tal cual
// como discriminador de unión sin mapeo adicional — mismo criterio que el resto de DTOs planos
// del proyecto.
public record ContributionSuggestionDto(string Type, PhotoDto Photo);

public static class ContributionSuggestionType
{
    public const string Tag = "tag";
    public const string Memory = "memory";
}
