import React from 'react';
import { BaulRole } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { Select } from '@/design-system/components/forms/Select';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

interface ManageAccessModalProps {
  role: BaulRole;
  onChangeRole: (role: BaulRole) => void;
  onCancel: () => void;
}

export function ManageAccessModal({ role, onChangeRole, onCancel }: ManageAccessModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel}>
      <h2 className="text-xl font-serif text-foreground mb-4">Gestionar acceso</h2>

      <Select
        label="Rol"
        value={role}
        onChange={(value) => onChangeRole(value as BaulRole)}
        options={[
          { value: 'colaborador', label: 'Colaborador' },
          { value: 'administrador', label: 'Administrador' },
        ]}
        className="bg-background px-3 py-2.5 text-sm"
      />

      <Button variant="secondary" fullWidth onClick={onCancel} className="mt-6 text-sm">
        Cerrar
      </Button>
    </BottomSheetModal>
  );
}
