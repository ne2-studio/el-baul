import React from 'react';
import { BaulRole } from '@/types';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';

interface ManageAccessModalProps {
  role: BaulRole;
  onChangeRole: (role: BaulRole) => void;
  onCancel: () => void;
}

export function ManageAccessModal({ role, onChangeRole, onCancel }: ManageAccessModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel}>
      <h2 className="text-xl font-serif text-foreground mb-4">Gestionar acceso</h2>

      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Rol</label>
        <select
          value={role}
          onChange={(e) => onChangeRole(e.target.value as BaulRole)}
          className="w-full text-sm px-3 py-2.5 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="colaborador">Colaborador</option>
          <option value="administrador">Administrador</option>
        </select>
      </div>

      <Button variant="secondary" fullWidth onClick={onCancel} className="mt-6 text-sm">
        Cerrar
      </Button>
    </BottomSheetModal>
  );
}
