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

  it('lets the backend isCustodio flag override role for custodian-only actions', () => {
    expect(getBaulPermissions({ role: 'administrador', isCustodio: true }).canRequestBaulDeletion).toBe(true);
    expect(getBaulPermissions({ role: 'custodio', isCustodio: false }).canRequestBaulDeletion).toBe(false);
  });

  it('keeps the existing plan-limit fallback for loaded baules without isCustodio', () => {
    expect(getBaulPermissions({ role: 'colaborador' }).countsAsCustodioForPlan).toBe(true);
    expect(getBaulPermissions({ role: 'sin_acceso' }).countsAsCustodioForPlan).toBe(false);
    expect(getBaulPermissions({ role: 'colaborador', isCustodio: false }).countsAsCustodioForPlan).toBe(false);
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
        canSharePersonaInvite: false,
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
        canSharePersonaInvite: true,
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
        canSharePersonaInvite: false,
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
        canSharePersonaInvite: false,
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
        canSharePersonaInvite: false,
        canChangePersonaRole: false,
        canRevokePersonaAccess: false,
        canRestorePersonaAccess: false,
      },
    },
  ])('maps current $currentBaulRole and target persona to manage capabilities', ({ currentBaulRole, target, expected }) => {
    expect(getPersonaPermissions({ currentBaulRole, persona: target })).toMatchObject(expected);
  });

  it('keeps self-edit capabilities tied to backend canEdit', () => {
    expect(getPersonaPermissions({ currentBaulRole: 'colaborador', persona: persona({ canEdit: true }) })).toMatchObject({
      canEditPersonaInfo: true,
      canEditPersonaBiography: true,
      canUploadPersonaAvatar: true,
    });

    expect(getPersonaPermissions({ currentBaulRole: 'custodio', persona: persona({ canEdit: false }) })).toMatchObject({
      canEditPersonaInfo: false,
      canEditPersonaBiography: false,
      canUploadPersonaAvatar: false,
    });
  });
});
