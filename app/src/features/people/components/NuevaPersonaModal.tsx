import React, { useState } from 'react';
import { BaulRole } from '@/types';
import { getRoleAccessDescription } from '@/utils/roleUtils';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { Select } from '@/design-system/components/forms/Select';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';

interface NuevaPersonaModalProps {
  onCancel: () => void;
  onSave: (nickname: string, role: BaulRole) => void;
  isSubmitting?: boolean;
  // Hidden when this modal is reused from "Invitar a la familia" (InvitarFamiliaRoute): that
  // flow always creates a Colaborador under the hood, no access choice shown.
  showAccessSelector?: boolean;
}

export function NuevaPersonaModal({
  onCancel,
  onSave,
  isSubmitting = false,
  showAccessSelector = true,
}: NuevaPersonaModalProps) {
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<BaulRole>('colaborador');

  const handleSave = () => {
    const trimmed = nickname.trim();
    if (!trimmed || isSubmitting) return;
    onSave(trimmed, role);
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">Nueva persona</h2>
      <Input
        label="Apodo"
        value={nickname}
        onChange={setNickname}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        placeholder="Ej. Abuela, Tío Juan…"
        variant="modal"
        autoFocus
      />
      {showAccessSelector && (
        <>
          <Select
            label="Acceso"
            value={role}
            onChange={(value) => setRole(value as BaulRole)}
            options={[
              { value: 'colaborador', label: 'Colaborador' },
              { value: 'administrador', label: 'Administrador' },
              { value: 'sin_acceso', label: 'Sin acceso' },
            ]}
          />
          <div className="bg-secondary rounded-lg p-3 text-sm text-muted-foreground">
            {getRoleAccessDescription(role)}
          </div>
        </>
      )}
      <ModalActions>
        <Button variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!nickname.trim() || isSubmitting}
          isLoading={isSubmitting}
          className="text-sm"
        >
          Añadir
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}
