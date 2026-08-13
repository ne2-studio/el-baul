import { Button } from '@/design-system/components/actions/Button';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PhotoStage } from '@/design-system/patterns/media/PhotoStage';
import { RecuerdoInput } from '@/features/memories/components/RecuerdoInput';
import { useElementHeight } from '@/hooks/useElementHeight';
import { Photo } from '@/types';

interface WriteMemorySuggestionScreenProps {
  photo: Photo;
  onSkip: () => void;
  onSave: (text: string) => void;
  isSubmitting?: boolean;
}

// Pantalla completa que WriteMemorySuggestionContainer muestra al entrar en el feed de un
// baúl, antes del propio feed: la recomendación de contribución "escribe un recuerdo", hermana
// de ContributionSuggestionScreen ("etiqueta personas") — ver BaulRoute para cómo se alterna
// entre las dos. Mismo esqueleto que ContributionSuggestionScreen (mismo header con "Ahora no",
// misma foto fija arriba vía PhotoStage/sticky) para que ambas se sientan como la misma familia
// de pantalla aunque la tarea sea distinta. RecuerdoInput ya trae su propio prompt rotativo
// ("¿Qué recuerdas de este momento?" y variantes) y botón de enviar, así que aquí no hay un
// segundo botón "Guardar" aparte — enviar el textarea es guardar.
export function WriteMemorySuggestionScreen({ photo, onSkip, onSave, isSubmitting = false }: WriteMemorySuggestionScreenProps) {
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
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

      {/* z-[9]: ver mismo comentario en ContributionSuggestionScreen. */}
      <div className="sticky z-[9] flex h-[50dvh] overflow-hidden bg-foreground/95" style={{ top: headerHeight }}>
        <PhotoStage
          photoKey={photo.id}
          src={photo.fullUrl}
          alt=""
          direction={0}
          hasPrevious={false}
          hasNext={false}
          onPrevious={() => {}}
          onNext={() => {}}
        />
      </div>

      <PageContainer className="py-6">
        <h2 className="text-base font-medium text-foreground mb-3">Cuéntanos algo sobre esta foto</h2>

        <RecuerdoInput photoId={photo.id} onSubmit={onSave} theme="light" />
      </PageContainer>
    </div>
  );
}
