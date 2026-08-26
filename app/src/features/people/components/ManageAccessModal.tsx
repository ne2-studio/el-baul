import React, { useState } from 'react';
import { BaulRole } from '@/types';
import { getRoleAccessDescription } from '@/utils/roleUtils';
import { Button } from '@/design-system/components/actions/Button';
import { Select } from '@/design-system/components/forms/Select';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';

interface ManageAccessModalProps {
  role: BaulRole;
  // "Sin acceso" only makes sense for a persona who hasn't joined yet — once Active (an
  // account is linked), locking them out requires "Revocar acceso" instead. See
  // PersonaManager.UpdatePersonaRoleAsync's server-side guard for the same rule.
  isActive: boolean;
  onSave: (role: BaulRole) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ManageAccessModal({ role, isActive, onSave, onCancel, isSubmitting = false }: ManageAccessModalProps) {
  const [selectedRole, setSelectedRole] = useState(role);

  const handleSave = () => {
    if (isSubmitting) return;
    onSave(selectedRole);
  };

  const options = [
    { value: 'colaborador', label: 'Colaborador' },
    { value: 'administrador', label: 'Administrador' },
    ...(isActive ? [] : [{ value: 'sin_acceso', label: 'Sin acceso' }]),
  ];

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">Gestionar permisos</h2>

      <Select
        label="Acceso"
        value={selectedRole}
        onChange={(value) => setSelectedRole(value as BaulRole)}
        options={options}
      />
      <div className="bg-secondary rounded-lg p-3 text-sm text-muted-foreground">
        {getRoleAccessDescription(selectedRole)}
      </div>

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
