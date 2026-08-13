import React, { useState } from 'react';
import { BaulRole } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { Select } from '@/design-system/components/forms/Select';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';

interface ManageAccessModalProps {
  role: BaulRole;
  onSave: (role: BaulRole) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ManageAccessModal({ role, onSave, onCancel, isSubmitting = false }: ManageAccessModalProps) {
  const [selectedRole, setSelectedRole] = useState(role);

  const handleSave = () => {
    if (isSubmitting) return;
    onSave(selectedRole);
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">Gestionar acceso</h2>

      <Select
        label="Rol"
        value={selectedRole}
        onChange={(value) => setSelectedRole(value as BaulRole)}
        options={[
          { value: 'colaborador', label: 'Colaborador' },
          { value: 'administrador', label: 'Administrador' },
        ]}
      />

      <ModalActions>
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting} className="text-sm">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={selectedRole === role || isSubmitting}
          isLoading={isSubmitting}
          className="text-sm"
        >
          Guardar cambios
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}
