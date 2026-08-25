import { describe, expect, it } from 'vitest';
import { BaulRole, Persona } from '@/types';
import { getBaulPermissions, getPersonaPermissions, isAdminRole } from '@/utils/roleUtils';

describe('roleUtils baul permissions', () => {
  it.each([
    {
      role: 'administrador' as BaulRole,
      isCustodio: true,
      expected: {
        isAdmin: true,
        isCustodio: true,
        canManageBaulInvite: true,
        canEditBaul: true,
        canRequestBaulDeletion: true,
        canReviewRemovalRequests: true,
        canSetBaulCover: true,
        canDeleteChapter: true,
      },
    },
    {
      role: 'administrador' as BaulRole,
      isCustodio: false,
      expected: {
        isAdmin: true,
        isCustodio: false,
        canManageBaulInvite: true,
        canEditBaul: true,
        canRequestBaulDeletion: false,
        canReviewRemovalRequests: true,
        canSetBaulCover: true,
        canDeleteChapter: true,
      },
    },
    {
      role: 'colaborador' as BaulRole,
      isCustodio: false,
      expected: {
        isAdmin: false,
        isCustodio: false,
        canManageBaulInvite: false,
        canEditBaul: false,
        canRequestBaulDeletion: false,
        canReviewRemovalRequests: false,
        canSetBaulCover: false,
        canDeleteChapter: false,
      },
    },
  ])('maps $role/isCustodio=$isCustodio to baul capabilities', ({ role, isCustodio, expected }) => {
    expect(getBaulPermissions({ role, isCustodio })).toMatchObject(expected);
    expect(isAdminRole(role)).toBe(role === 'administrador');
  });

  // Custodio isn't a BaulRole value (see types/index.ts) — it's the caller's own separate
  // isCustodio flag, independent of role, and it must win even over a non-admin role (the
  // custodio's own Persona row is always Administrador in practice, but this asserts the rule
  // holds regardless).
  it('lets isCustodio grant admin/custodio capabilities regardless of role', () => {
    expect(getBaulPermissions({ role: 'colaborador', isCustodio: true })).toMatchObject({
      isAdmin: true,
      isCustodio: true,
      canRequestBaulDeletion: true,
    });
    expect(getBaulPermissions({ role: 'administrador', isCustodio: false }).canRequestBaulDeletion).toBe(false);
  });
});

describe('roleUtils persona permissions', () => {
  function persona(overrides: Partial<Pick<Persona, 'role' | 'isCustodio' | 'status' | 'canEdit'>> = {}) {
    return {
      role: 'colaborador' as BaulRole,
      isCustodio: false,
      status: 'active' as const,
      canEdit: false,
      ...overrides,
    };
  }

  it.each([
    {
      currentBaulRole: 'administrador' as BaulRole,
      currentIsCustodio: true,
      target: persona({ role: 'colaborador', status: 'active' }),
      expected: {
        canManagePersona: true,
        canChangePersonaRole: true,
        canRevokePersonaAccess: true,
      },
    },
    {
      currentBaulRole: 'administrador' as BaulRole,
      currentIsCustodio: false,
      target: persona({ role: 'colaborador', status: 'pending' }),
      expected: {
        canManagePersona: true,
        canChangePersonaRole: false,
        canRevokePersonaAccess: true,
      },
    },
    {
      currentBaulRole: 'administrador' as BaulRole,
      currentIsCustodio: false,
      target: persona({ role: 'administrador', isCustodio: true, status: 'active' }),
      expected: {
        canManagePersona: false,
        canChangePersonaRole: false,
        canRevokePersonaAccess: false,
      },
    },
    {
      currentBaulRole: 'colaborador' as BaulRole,
      currentIsCustodio: false,
      target: persona({ role: 'colaborador', status: 'active' }),
      expected: {
        canManagePersona: false,
        canChangePersonaRole: false,
        canRevokePersonaAccess: false,
      },
    },
  ])('maps current $currentBaulRole (isCustodio=$currentIsCustodio) and target persona to manage capabilities', ({ currentBaulRole, currentIsCustodio, target, expected }) => {
    expect(getPersonaPermissions({ currentBaulRole, currentIsCustodio, persona: target })).toMatchObject(expected);
  });

  it('keeps identity self-edit capabilities tied to backend canEdit', () => {
    expect(getPersonaPermissions({ currentBaulRole: 'colaborador', persona: persona({ canEdit: true }) })).toMatchObject({
      canEditPersonaInfo: true,
      canUploadPersonaAvatar: true,
    });

    expect(getPersonaPermissions({
      currentBaulRole: 'administrador',
      currentIsCustodio: true,
      persona: persona({ canEdit: false }),
    })).toMatchObject({
      canEditPersonaInfo: false,
      canUploadPersonaAvatar: false,
    });
  });

  it('lets any baúl member edit biography regardless of backend canEdit', () => {
    expect(getPersonaPermissions({ currentBaulRole: 'colaborador', persona: persona({ canEdit: false }) })).toMatchObject({
      canEditPersonaBiography: true,
    });

    expect(getPersonaPermissions({ currentBaulRole: undefined, persona: persona({ canEdit: false }) })).toMatchObject({
      canEditPersonaBiography: false,
    });
  });
});
