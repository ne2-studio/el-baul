import { Check } from 'lucide-react';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';
import { Persona } from '@/types';

interface TagPersonasModalProps {
  title?: string;
  personas: Persona[];
  selectedIds: string[];
  onToggle: (personaId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

// Variante multi-selección de MoveModal: en vez de un único capítulo, se pueden marcar
// varias personas del baúl para etiquetarlas. Se usa tanto en el visor de una foto
// (reemplaza el conjunto completo de etiquetas) como en la selección múltiple de la
// cuadrícula (añade a las etiquetas ya existentes de cada foto) — `title` distingue el caso.
export function TagPersonasModal({
  title = 'Etiquetar personas',
  personas,
  selectedIds,
  onToggle,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: TagPersonasModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel} backdropOpacity={40}>
      <h2 className="text-lg font-medium text-foreground mb-4">{title}</h2>
      <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
        {personas.map((persona) => {
          const isSelected = selectedIds.includes(persona.id);
          return (
            <button
              key={persona.id}
              onClick={() => onToggle(persona.id)}
              disabled={isSubmitting}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left disabled:opacity-60 ${
                isSelected ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-secondary/30'
              }`}
            >
              {persona.avatarUrl ? (
                <img src={persona.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs text-muted-foreground">
                  {persona.nickname.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-foreground flex-1">{persona.nickname}</span>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                isSelected ? 'bg-primary border-primary' : 'border-border'
              }`}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="flex-1 text-sm"
        >
          Guardar
        </Button>
      </div>
    </BottomSheetModal>
  );
}
