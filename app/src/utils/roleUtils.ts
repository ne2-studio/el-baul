import { Baul, BaulRole, Persona } from '../types';

export interface BaulPermissions {
  isAdmin: boolean;
  isCustodio: boolean;
  canCreatePersona: boolean;
  canManageBaulInvite: boolean;
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
  canChangePersonaRole: boolean;
  canRevokePersonaAccess: boolean;
}

export function getRoleDisplayName(role: BaulRole): string {
  const roleNames: Record<BaulRole, string> = {
    administrador: 'Administrador',
    colaborador: 'Colaborador',
  };
  return roleNames[role];
}

export function getRoleDescription(role: BaulRole): string {
  const descriptions: Record<BaulRole, string> = {
    administrador: 'Gestiona el baúl, igual que el custodio',
    colaborador: 'Puede añadir fotos',
  };
  return descriptions[role];
}

export function isAdminRole(role?: BaulRole): boolean {
  return role === 'administrador';
}

export function getBaulPermissions(baul?: Pick<Baul, 'role' | 'isCustodio'>): BaulPermissions {
  const isCustodio = baul?.isCustodio ?? false;
  const isAdmin = isCustodio || isAdminRole(baul?.role);

  return {
    isAdmin,
    isCustodio,
    canCreatePersona: isAdmin,
    canManageBaulInvite: isAdmin,
    canEditBaul: isAdmin,
    canRequestBaulDeletion: isCustodio,
    canReviewRemovalRequests: isAdmin,
    canSetBaulCover: isAdmin,
    canDeleteChapter: isAdmin,
  };
}

export function getPersonaPermissions({
  currentBaulRole,
  currentIsCustodio,
  persona,
}: {
  currentBaulRole?: BaulRole;
  currentIsCustodio?: boolean;
  persona: Pick<Persona, 'role' | 'status' | 'canEdit' | 'isCustodio'>;
}): PersonaPermissions {
  const currentBaulPermissions = getBaulPermissions({ role: currentBaulRole, isCustodio: currentIsCustodio });
  const canEditOwnPersona = persona.canEdit ?? false;
  // Biografía is shared, wiki-like family content: any member of the baúl can write it for any
  // persona, unlike name/nickname/avatar which stay tied to identity-edit permission.
  const canEditAnyBiography = currentBaulRole !== undefined;
  // The custodio's own row is never manageable by another admin — it's protected server-side
  // too, see Persona.IsCustodioProtected.
  const canManagePersona = currentBaulPermissions.isAdmin && !persona.isCustodio;
  const isPending = persona.status === 'pending';

  return {
    canEditPersonaInfo: canEditOwnPersona,
    canEditPersonaBiography: canEditAnyBiography,
    canUploadPersonaAvatar: canEditOwnPersona,
    canManagePersona,
    canChangePersonaRole: canManagePersona && !isPending,
    canRevokePersonaAccess: canManagePersona,
  };
}
