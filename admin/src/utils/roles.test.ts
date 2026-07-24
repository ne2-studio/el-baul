import { describe, expect, it } from 'vitest';
import { hasAdminRole } from './roles';

describe('hasAdminRole', () => {
  it('returns false when the profile is undefined', () => {
    expect(hasAdminRole(undefined)).toBe(false);
  });

  it('returns false for an empty profile', () => {
    expect(hasAdminRole({})).toBe(false);
  });

  describe('flat "roles" claim as an array', () => {
    it('returns true when the array contains "admin"', () => {
      expect(hasAdminRole({ roles: ['user', 'admin'] })).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(hasAdminRole({ roles: ['ADMIN'] })).toBe(true);
    });

    it('returns false when the array does not contain "admin"', () => {
      expect(hasAdminRole({ roles: ['user', 'editor'] })).toBe(false);
    });

    it('returns false for an empty array', () => {
      expect(hasAdminRole({ roles: [] })).toBe(false);
    });
  });

  describe('flat "roles" claim as a single string', () => {
    it('returns true when the string is "admin"', () => {
      expect(hasAdminRole({ roles: 'admin' })).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(hasAdminRole({ roles: 'Admin' })).toBe(true);
    });

    it('returns false for a non-admin string', () => {
      expect(hasAdminRole({ roles: 'user' })).toBe(false);
    });
  });

  describe('Zitadel roles-object claim', () => {
    const ZITADEL_ROLES_CLAIM = 'urn:zitadel:iam:org:project:roles';

    it('returns true when "admin" is a key of the roles object', () => {
      expect(
        hasAdminRole({ [ZITADEL_ROLES_CLAIM]: { admin: { orgId: 'org-1' } } })
      ).toBe(true);
    });

    it('is case-insensitive on the key', () => {
      expect(
        hasAdminRole({ [ZITADEL_ROLES_CLAIM]: { Admin: { orgId: 'org-1' } } })
      ).toBe(true);
    });

    it('returns false when no key matches "admin"', () => {
      expect(
        hasAdminRole({ [ZITADEL_ROLES_CLAIM]: { user: { orgId: 'org-1' } } })
      ).toBe(false);
    });

    it('returns false for an empty roles object', () => {
      expect(hasAdminRole({ [ZITADEL_ROLES_CLAIM]: {} })).toBe(false);
    });

    it('returns false when the claim is not an object', () => {
      expect(hasAdminRole({ [ZITADEL_ROLES_CLAIM]: 'admin' })).toBe(false);
      expect(hasAdminRole({ [ZITADEL_ROLES_CLAIM]: null })).toBe(false);
    });
  });

  it('returns false when neither the flat nor the Zitadel claim is present', () => {
    expect(hasAdminRole({ sub: 'user-1', email: 'user@example.com' })).toBe(false);
  });
});
