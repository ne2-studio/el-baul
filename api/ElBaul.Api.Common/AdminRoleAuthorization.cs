using System.Security.Claims;
using System.Text.Json;

namespace ElBaul.Api;

/// <summary>
/// Backs the "AdminOnly" authorization policy (see Program.cs). Handles two different
/// claim shapes for the same concept, since local dev and real deployments assert roles
/// differently:
///  - fake-oidc (local dev, docker-compose.yaml OIDC_USERS): a flat "roles" claim, either a
///    JSON array value or one claim instance per role depending on how the JWT handler
///    explodes it.
///  - Zitadel (real deployments): "urn:zitadel:iam:org:project:roles", a JSON object shaped
///    like {"admin": {"<orgId>": "<orgName>"}} — only present if the client requested the
///    urn:zitadel:iam:org:project:roles scope and the project has role assertion enabled.
///
/// Also checks ClaimTypes.Role: JwtSecurityTokenHandler's default inbound claim mapping
/// silently rewrites a "roles" (and "role") claim's Type to
/// http://schemas.microsoft.com/ws/2008/06/identity/claims/role before it ever reaches this
/// method — the same reason UserSyncMiddleware/HttpContextCurrentUserProvider check both
/// "sub" and ClaimTypes.NameIdentifier for the same claim. Confirmed against a real
/// fake-oidc-issued token, not assumed.
/// </summary>
public static class AdminRoleAuthorization
{
    private const string FakeOidcRolesClaim = "roles";
    private const string ZitadelRolesClaim = "urn:zitadel:iam:org:project:roles";
    private const string AdminRole = "admin";

    public static bool HasAdminRole(ClaimsPrincipal user)
    {
        foreach (var claim in user.Claims.Where(c => c.Type is FakeOidcRolesClaim or ZitadelRolesClaim or ClaimTypes.Role))
        {
            if (string.Equals(claim.Value, AdminRole, StringComparison.OrdinalIgnoreCase))
            {
                return true; // one claim instance per role, e.g. "roles": "admin"
            }

            if (!TryParseJson(claim.Value, out var doc))
            {
                continue;
            }

            using (doc)
            {
                if (doc.RootElement.ValueKind == JsonValueKind.Array &&
                    doc.RootElement.EnumerateArray().Any(e =>
                        string.Equals(e.GetString(), AdminRole, StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }

                if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                    doc.RootElement.EnumerateObject().Any(p =>
                        string.Equals(p.Name, AdminRole, StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static bool TryParseJson(string value, out JsonDocument document)
    {
        try
        {
            document = JsonDocument.Parse(value);
            return true;
        }
        catch (JsonException)
        {
            document = null!;
            return false;
        }
    }
}
