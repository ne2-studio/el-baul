using System.Globalization;

namespace ElBaul.Core.Users.Domain;

/// <summary>
/// Normalizes freeform full-name strings (e.g. the OIDC "name" claim, or an existing
/// User.Name value being backfilled) into the Nombre/Apellidos split stored on User.
/// Shared by UserSyncMiddleware (new-user upsert) and the SplitUserNombreApellidos data
/// migration, so both apply identical normalization.
/// </summary>
public static class PersonNameNormalizer
{
    /// <summary>
    /// Splits a full name on whitespace: the first word becomes Nombre, the remaining
    /// word(s) — joined by a single space — become Apellidos (null if there's only one
    /// word). Both parts are normalized (see <see cref="Normalize"/>). Null/blank input
    /// yields (null, null).
    /// </summary>
    public static (string? Nombre, string? Apellidos) Split(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return (null, null);

        var words = fullName.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        var nombre = Normalize(words[0]);
        var apellidos = words.Length > 1 ? Normalize(string.Join(' ', words[1..])) : null;
        return (nombre, apellidos);
    }

    /// <summary>
    /// Trims, collapses internal whitespace, and title-cases each word (first letter
    /// uppercase, rest lowercase).
    /// </summary>
    public static string Normalize(string value)
    {
        var words = value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', words.Select(CapitalizeWord));
    }

    private static string CapitalizeWord(string word) =>
        word.Length == 0
            ? word
            : char.ToUpper(word[0], CultureInfo.InvariantCulture) + word[1..].ToLower(CultureInfo.InvariantCulture);
}
