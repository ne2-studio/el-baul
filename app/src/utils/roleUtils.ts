import { BaulRole } from '../types';

export function getRoleDisplayName(role: BaulRole): string {
  const roleNames: Record<BaulRole, string> = {
    custodio: 'Custodio',
    colaborador: 'Colaborador',
    miembro: 'Miembro'
  };
  return roleNames[role];
}

export function getRoleDescription(role: BaulRole): string {
  const descriptions: Record<BaulRole, string> = {
    custodio: 'Gestiona el baúl',
    colaborador: 'Puede añadir fotos',
    miembro: 'Solo ver'
  };
  return descriptions[role];
}
