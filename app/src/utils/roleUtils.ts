import { BaulRole } from '../types';

export function getRoleDisplayName(role: BaulRole): string {
  const roleNames: Record<BaulRole, string> = {
    custodio: 'Custodio',
    administrador: 'Administrador',
    colaborador: 'Colaborador'
  };
  return roleNames[role];
}

export function getRoleDescription(role: BaulRole): string {
  const descriptions: Record<BaulRole, string> = {
    custodio: 'Gestiona el baúl',
    administrador: 'Gestiona el baúl, igual que el custodio',
    colaborador: 'Puede añadir fotos'
  };
  return descriptions[role];
}

export function isAdminRole(role?: BaulRole): boolean {
  return role === 'custodio' || role === 'administrador';
}
