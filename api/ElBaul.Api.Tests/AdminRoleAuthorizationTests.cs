using System.Security.Claims;
using ElBaul.Api;

namespace ElBaul.Api.Tests;

public class AdminRoleAuthorizationTests
{
    private static ClaimsPrincipal PrincipalWith(params Claim[] claims) =>
        new(new ClaimsIdentity(claims, "TestAuth"));

    [Fact]
    public void HasAdminRole_ShouldReturnFalse_WhenNoRolesClaimPresent()
    {
        var user = PrincipalWith(new Claim("sub", "user-1"));

        Assert.False(AdminRoleAuthorization.HasAdminRole(user));
    }

    [Fact]
    public void HasAdminRole_ShouldReturnTrue_ForFakeOidcFlatJsonArrayClaim()
    {
        // fake-oidc / docker-compose.yaml OIDC_USERS shape.
        var user = PrincipalWith(new Claim("roles", "[\"admin\"]"));

        Assert.True(AdminRoleAuthorization.HasAdminRole(user));
    }

    [Fact]
    public void HasAdminRole_ShouldReturnFalse_ForFakeOidcFlatJsonArrayClaim_WithoutAdmin()
    {
        var user = PrincipalWith(new Claim("roles", "[\"user\"]"));

        Assert.False(AdminRoleAuthorization.HasAdminRole(user));
    }

    [Fact]
    public void HasAdminRole_ShouldReturnTrue_WhenJwtHandlerExplodesArrayIntoOneClaimPerRole()
    {
        var user = PrincipalWith(new Claim("roles", "user"), new Claim("roles", "admin"));

        Assert.True(AdminRoleAuthorization.HasAdminRole(user));
    }

    [Fact]
    public void HasAdminRole_ShouldReturnTrue_WhenJwtSecurityTokenHandlerRemapsRolesClaimType()
    {
        // The actual shape JwtBearer hands us in production, confirmed against a real
        // fake-oidc-issued token: JwtSecurityTokenHandler's default inbound claim mapping
        // silently rewrites "roles" to ClaimTypes.Role and explodes a JSON array into one
        // claim per element — it does NOT arrive as a literal "roles"-typed claim.
        var user = PrincipalWith(new Claim(ClaimTypes.Role, "admin"));

        Assert.True(AdminRoleAuthorization.HasAdminRole(user));
    }

    [Fact]
    public void HasAdminRole_ShouldReturnTrue_ForZitadelNestedObjectClaim()
    {
        var user = PrincipalWith(new Claim(
            "urn:zitadel:iam:org:project:roles",
            "{\"admin\":{\"123456\":\"my-org\"}}"));

        Assert.True(AdminRoleAuthorization.HasAdminRole(user));
    }

    [Fact]
    public void HasAdminRole_ShouldReturnFalse_ForZitadelNestedObjectClaim_WithoutAdmin()
    {
        var user = PrincipalWith(new Claim(
            "urn:zitadel:iam:org:project:roles",
            "{\"colaborador\":{\"123456\":\"my-org\"}}"));

        Assert.False(AdminRoleAuthorization.HasAdminRole(user));
    }

    [Fact]
    public void HasAdminRole_ShouldBeCaseInsensitive()
    {
        var user = PrincipalWith(new Claim("roles", "[\"Admin\"]"));

        Assert.True(AdminRoleAuthorization.HasAdminRole(user));
    }

    [Fact]
    public void HasAdminRole_ShouldIgnoreMalformedJsonClaimValue()
    {
        var user = PrincipalWith(new Claim("roles", "not-json"));

        Assert.False(AdminRoleAuthorization.HasAdminRole(user));
    }
}
