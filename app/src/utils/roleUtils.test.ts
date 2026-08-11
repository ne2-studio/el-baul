import { describe, expect, it } from 'vitest';
import { BaulRole, Persona } from '@/types';
import { getBaulPermissions, getPersonaPermissions, isAdminRole } from '@/utils/roleUtils';

describe('roleUtils baul permissions', () => {
  it.each([
    {
      role: 'custodio' as BaulRole,
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
    {
      role: 'sin_acceso' as BaulRole,
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
  ])('maps $role to baul capabilities', ({ role, expected }) => {
    expect(getBaulPermissions({ role })).toMatchObject(expected);
    expect(isAdminRole(role)).toBe(expected.isAdmin);
  });

  it('derives isCustodio purely from role, since the backend only ever reports role', () => {
    expect(getBaulPermissions({ role: 'administrador' }).canRequestBaulDeletion).toBe(false);
    expect(getBaulPermissions({ role: 'custodio' }).canRequestBaulDeletion).toBe(true);
  });

  it('only the custodio role counts towards the plan limit', () => {
    expect(getBaulPermissions({ role: 'custodio' }).countsAsCustodioForPlan).toBe(true);
    expect(getBaulPermissions({ role: 'administrador' }).countsAsCustodioForPlan).toBe(false);
    expect(getBaulPermissions({ role: 'colaborador' }).countsAsCustodioForPlan).toBe(false);
    expect(getBaulPermissions({ role: 'sin_acceso' }).countsAsCustodioForPlan).toBe(false);
    expect(getBaulPermissions().countsAsCustodioForPlan).toBe(false);
  });
});

describe('roleUtils persona permissions', () => {
  function persona(overrides: Partial<Pick<Persona, 'role' | 'status' | 'canEdit'>> = {}) {
    return {
      role: 'colaborador' as BaulRole,
      status: 'active' as const,
      canEdit: false,
      ...overrides,
    };
  }

  it.each([
    {
      currentBaulRole: 'custodio' as BaulRole,
      target: persona({ role: 'colaborador', status: 'active' }),
      expected: {
        canManagePersona: true,
        canChangePersonaRole: true,
        canRevokePersonaAccess: true,
        canRestorePersonaAccess: false,
      },
    },
    {
      currentBaulRole: 'administrador' as BaulRole,
      target: persona({ role: 'colaborador', status: 'pending' }),
      expected: {
        canManagePersona: true,
        canChangePersonaRole: false,
        canRevokePersonaAccess: true,
        canRestorePersonaAccess: false,
      },
    },
    {
      currentBaulRole: 'administrador' as BaulRole,
      target: persona({ role: 'custodio', status: 'active' }),
      expected: {
        canManagePersona: false,
        canChangePersonaRole: false,
        canRevokePersonaAccess: false,
        canRestorePersonaAccess: false,
      },
    },
    {
      currentBaulRole: 'administrador' as BaulRole,
      target: persona({ role: 'sin_acceso', status: 'sin_acceso' }),
      expected: {
        canManagePersona: true,
        canChangePersonaRole: false,
        canRevokePersonaAccess: false,
        canRestorePersonaAccess: true,
      },
    },
    {
      currentBaulRole: 'colaborador' as BaulRole,
      target: persona({ role: 'colaborador', status: 'active' }),
      expected: {
        canManagePersona: false,
        canChangePersonaRole: false,
        canRevokePersonaAccess: false,
        canRestorePersonaAccess: false,
      },
    },
  ])('maps current $currentBaulRole and target persona to manage capabilities', ({ currentBaulRole, target, expected }) => {
    expect(getPersonaPermissions({ currentBaulRole, persona: target })).toMatchObject(expected);
  });

  it('keeps identity self-edit capabilities tied to backend canEdit', () => {
    expect(getPersonaPermissions({ currentBaulRole: 'colaborador', persona: persona({ canEdit: true }) })).toMatchObject({
      canEditPersonaInfo: true,
      canUploadPersonaAvatar: true,
    });

    expect(getPersonaPermissions({ currentBaulRole: 'custodio', persona: persona({ canEdit: false }) })).toMatchObject({
      canEditPersonaInfo: false,
      canUploadPersonaAvatar: false,
    });
  });

  it('lets any baúl member edit biography regardless of backend canEdit', () => {
    expect(getPersonaPermissions({ currentBaulRole: 'colaborador', persona: persona({ canEdit: false }) })).toMatchObject({
      canEditPersonaBiography: true,
    });

    expect(getPersonaPermissions({ currentBaulRole: 'sin_acceso', persona: persona({ canEdit: false }) })).toMatchObject({
      canEditPersonaBiography: false,
    });

    expect(getPersonaPermissions({ currentBaulRole: undefined, persona: persona({ canEdit: false }) })).toMatchObject({
      canEditPersonaBiography: false,
    });
  });
});
