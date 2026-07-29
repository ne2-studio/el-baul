import { Baul, BaulRole, Persona } from '../types';

export interface BaulPermissions {
  isAdmin: boolean;
  isCustodio: boolean;
  countsAsCustodioForPlan: boolean;
  canCreatePersona: boolean;
  canEditBaul: boolean;
  canRequestBaulDeletion: boolean;
  canReviewRemovalRequests: boolean;
  canSetBaulCover: boolean;
  canDeleteChapter: boolean;
}

export interface PersonaPermissions {
  canEditPersonaInfo: boolean;
  canEditPersonaBiography: boolean;
  canUploadPersonaAvatar: boolean;
  canManagePersona: boolean;
  canSharePersonaInvite: boolean;
  canChangePersonaRole: boolean;
  canRevokePersonaAccess: boolean;
  canRestorePersonaAccess: boolean;
}

export function getRoleDisplayName(role: BaulRole): string {
  const roleNames: Record<BaulRole, string> = {
    custodio: 'Custodio',
    administrador: 'Administrador',
    colaborador: 'Colaborador',
    sin_acceso: 'Sin acceso'
  };
  return roleNames[role];
}

export function getRoleDescription(role: BaulRole): string {
  const descriptions: Record<BaulRole, string> = {
    custodio: 'Gestiona el baúl',
    administrador: 'Gestiona el baúl, igual que el custodio',
    colaborador: 'Puede añadir fotos',
    sin_acceso: 'Forma parte de la historia, sin acceso al baúl'
  };
  return descriptions[role];
}

export function isAdminRole(role?: BaulRole): boolean {
  return role === 'custodio' || role === 'administrador';
}

function isCustodioRole(role?: BaulRole): boolean {
  return role === 'custodio';
}

export function getBaulPermissions(baul?: Pick<Baul, 'role' | 'isCustodio'>): BaulPermissions {
  const isAdmin = isAdminRole(baul?.role);
  const isCustodio = baul?.isCustodio ?? isCustodioRole(baul?.role);

  return {
    isAdmin,
    isCustodio,
    countsAsCustodioForPlan: baul ? baul.isCustodio !== false && baul.role !== 'sin_acceso' : false,
    canCreatePersona: isAdmin,
    canEditBaul: isAdmin,
    canRequestBaulDeletion: isCustodio,
    canReviewRemovalRequests: isAdmin,
    canSetBaulCover: isAdmin,
    canDeleteChapter: isAdmin,
  };
}

export function getPersonaPermissions({
  currentBaulRole,
  persona,
}: {
  currentBaulRole?: BaulRole;
  persona: Pick<Persona, 'role' | 'status' | 'canEdit'>;
}): PersonaPermissions {
  const currentBaulPermissions = getBaulPermissions({ role: currentBaulRole });
  const canEditOwnPersona = persona.canEdit ?? false;
  const hasNoAccess = persona.role === 'sin_acceso' || persona.status === 'sin_acceso';
  const canManagePersona = currentBaulPermissions.isAdmin && !isCustodioRole(persona.role);
  const isPending = persona.status === 'pending';

  return {
    canEditPersonaInfo: canEditOwnPersona,
    canEditPersonaBiography: canEditOwnPersona,
    canUploadPersonaAvatar: canEditOwnPersona,
    canManagePersona,
    canSharePersonaInvite: canManagePersona && isPending && !hasNoAccess,
    canChangePersonaRole: canManagePersona && !isPending && !hasNoAccess,
    canRevokePersonaAccess: canManagePersona && !hasNoAccess,
    canRestorePersonaAccess: canManagePersona && hasNoAccess,
  };
}
