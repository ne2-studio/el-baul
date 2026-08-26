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
    sin_acceso: 'Sin acceso',
  };
  return roleNames[role];
}

// Subtext shown under the access-level selector in NuevaPersonaModal/ManageAccessModal, one
// line per option, for whichever one is currently selected.
export function getRoleAccessDescription(role: BaulRole): string {
  const descriptions: Record<BaulRole, string> = {
    administrador: 'Podrá ver, contribuir y gestionar el baúl cuando lo invites.',
    colaborador: 'Podrá ver y contribuir al baúl cuando lo invites.',
    sin_acceso: 'Formará parte de la historia, pero no podrá acceder al baúl.',
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
    // "Gestionar acceso" is available at any point before a persona joins, not just once
    // they're Active, so an admin can pick their access level upfront.
    canChangePersonaRole: canManagePersona,
    canRevokePersonaAccess: canManagePersona && !isPending,
  };
}
