interface ConfirmDeleteBaulModalProps {
  baulName: string;
  chapterCount: number;
  photoCount: number;
  recuerdoCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function ConfirmDeleteBaulModal({
  baulName,
  chapterCount,
  photoCount,
  recuerdoCount,
  onCancel,
  onConfirm,
  isSubmitting = false,
  error = null,
}: ConfirmDeleteBaulModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="absolute inset-0" onClick={isSubmitting ? undefined : onCancel} />
      <div className="relative bg-card w-full max-w-md rounded-2xl border border-border shadow-lg p-6">
        <h2 className="text-lg mb-1">Eliminar baúl</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Vas a eliminar <span className="font-medium text-foreground">{baulName}</span>.
        </p>

        <div className="bg-destructive/8 border border-destructive/20 rounded-xl p-3 mb-5">
          <p className="text-xs text-destructive/80 leading-relaxed">
            <span className="font-semibold">Atención:</span> esta acción es irreversible y borrará permanentemente{' '}
            {pluralize(chapterCount, 'capítulo', 'capítulos')}, {pluralize(photoCount, 'foto', 'fotos')} y{' '}
            {pluralize(recuerdoCount, 'recuerdo', 'recuerdos')}. No es un borrado lógico: no se puede deshacer.
          </p>
        </div>

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
            {isSubmitting ? 'Eliminando…' : 'Sí, eliminar baúl'}
          </button>
        </div>
      </div>
    </div>
  );
}
