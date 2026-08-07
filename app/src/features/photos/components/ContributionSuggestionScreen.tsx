import { Button } from '@/design-system/components/actions/Button';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PersonaSelectionList } from '@/features/photos/components/PersonaSelectionList';
import { Persona, Photo } from '@/types';

interface ContributionSuggestionScreenProps {
  photo: Photo;
  personas: Persona[];
  selectedIds: string[];
  onToggle: (personaId: string) => void;
  onSkip: () => void;
  onSave: () => void;
  isSubmitting?: boolean;
}

// Pantalla completa que ContributionSuggestionContainer muestra al entrar en el feed de un
// baúl, antes del propio feed: la única recomendación de contribución del MVP (identificar
// personas en una foto sin etiquetar), pensada para completarse en segundos o ignorarse sin
// fricción con "Ahora no" — nunca se presenta como una tarea pendiente. Reutiliza
// PersonaSelectionList tal cual, el mismo selector que TagPersonasModal usa para etiquetar
// desde el visor de fotos, sin ningún paso intermedio entre la foto y el selector.
export function ContributionSuggestionScreen({
  photo,
  personas,
  selectedIds,
  onToggle,
  onSkip,
  onSave,
  isSubmitting = false,
}: ContributionSuggestionScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="row"
        leading={<h1 className="text-lg font-medium text-foreground">¿Nos ayudas con esta foto?</h1>}
        trailing={
          <Button
            variant="plain"
            onClick={onSkip}
            disabled={isSubmitting}
            className="text-sm text-muted-foreground shrink-0 whitespace-nowrap"
          >
            Ahora no →
          </Button>
        }
      />

      <PageContainer className="py-6 pb-10">
        <img src={photo.fullUrl} alt="" className="w-full max-h-[50vh] object-cover rounded-2xl mb-6" />

        <h2 className="text-base font-medium text-foreground mb-3">¿Quién sale en esta foto?</h2>

        <div className="space-y-2 mb-8">
          <PersonaSelectionList personas={personas} selectedIds={selectedIds} onToggle={onToggle} disabled={isSubmitting} />
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={onSave}
          disabled={selectedIds.length === 0 || isSubmitting}
          isLoading={isSubmitting}
        >
          Guardar
        </Button>
      </PageContainer>
    </div>
  );
}
