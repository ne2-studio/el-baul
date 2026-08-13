interface ConfirmUnlinkPersonaModalProps {
  personaLabel: string;
  linkedUserLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export function ConfirmUnlinkPersonaModal({
  personaLabel,
  linkedUserLabel,
  onCancel,
  onConfirm,
  isSubmitting = false,
  error = null,
}: ConfirmUnlinkPersonaModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="absolute inset-0" onClick={isSubmitting ? undefined : onCancel} />
      <div className="relative bg-card w-full max-w-md rounded-2xl border border-border shadow-lg p-6">
        <h2 className="text-lg mb-1">Desvincular persona</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Vas a desvincular a <span className="font-medium text-foreground">{personaLabel}</span> de la cuenta{' '}
          <span className="font-medium text-foreground">{linkedUserLabel}</span>. La persona quedará sin cuenta
          asociada y podrá ser reclamada de nuevo desde el enlace de invitación del baúl.
        </p>

        {error && <p className="text-xs text-destructive mb-4">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Desvinculando…' : 'Sí, desvincular'}
          </button>
        </div>
      </div>
    </div>
  );
}
