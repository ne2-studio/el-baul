// Client-side mirror of the backend's AdminRoleAuthorization.HasAdminRole
// (api/ElBaul.Api/AdminRoleAuthorization.cs) — this is a UX gate only (skip the app for a
// non-admin instead of letting them hit a 403 on every screen), NOT the security boundary.
// The real check is server-side: every /api/admin/* endpoint requires the AdminOnly policy.
const ADMIN_ROLE = 'admin';
const ZITADEL_ROLES_CLAIM = 'urn:zitadel:iam:org:project:roles';

export function hasAdminRole(profile: Record<string, unknown> | undefined): boolean {
  if (!profile) return false;

  const flatRoles = profile.roles;
  if (Array.isArray(flatRoles) && flatRoles.some((r) => String(r).toLowerCase() === ADMIN_ROLE)) {
    return true;
  }
  if (typeof flatRoles === 'string' && flatRoles.toLowerCase() === ADMIN_ROLE) {
    return true;
  }

  const zitadelRoles = profile[ZITADEL_ROLES_CLAIM];
  if (zitadelRoles && typeof zitadelRoles === 'object') {
    return Object.keys(zitadelRoles as object).some((role) => role.toLowerCase() === ADMIN_ROLE);
  }

  return false;
}
