import { Button } from '@/design-system/components/actions/Button';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PhotoStage } from '@/design-system/patterns/media/PhotoStage';
import { PersonaSelectionList } from '@/features/photos/components/PersonaSelectionList';
import { useElementHeight } from '@/hooks/useElementHeight';
import { photoStageHeight, usePhotoAspectRatio } from '@/hooks/usePhotoAspectRatio';
import { Persona, Photo } from '@/types';

interface ContributionSuggestionScreenProps {
  photo: Photo;
  personas: Persona[];
  selectedIds: string[];
  onToggle: (personaId: string) => void;
  onSkip: () => void;
  onSave: () => void;
  onConfirmNoPersonas: () => void;
  isSubmitting?: boolean;
}

// Pantalla completa que ContributionSuggestionContainer muestra al entrar en el feed de un
// baúl, antes del propio feed: la única recomendación de contribución del MVP (identificar
// personas en una foto sin etiquetar), pensada para completarse en segundos o ignorarse sin
// fricción con "Ahora no" — nunca se presenta como una tarea pendiente. Reutiliza
// PersonaSelectionList tal cual, el mismo selector que TagPersonasModal usa para etiquetar
// desde el visor de fotos, sin ningún paso intermedio entre la foto y el selector.
//
// La página sigue teniendo scroll normal (no una región interna aparte) — la foto y el botón
// se quedan fijos por el mismo mecanismo que Tabbar ya usa para apilarse debajo de PageHeader:
// `sticky` con un offset MEDIDO (useElementHeight), no un valor fijo, porque WKWebView (iOS) y
// Chrome WebView (Android) renderizan la misma cabecera a alturas ligeramente distintas. Así,
// al hacer scroll, lo único que se mueve por debajo es la lista de personas — la foto candidata
// queda siempre visible mientras se decide a quién etiquetar. Alto de la foto vía PhotoStage,
// el mismo componente del visor de fotos de la galería, para tener los mismos gestos de zoom
// (pellizco y doble toque); sin hasPrevious/hasNext porque aquí no hay carrusel, solo la única
// foto candidata.
//
// El alto NO es fijo: se deriva del aspect ratio real de la foto (usePhotoAspectRatio,
// photoStageHeight) para que una foto landscape ocupe solo lo que necesita en vez de dejar
// franjas negras arriba y abajo (PhotoStage pinta con object-contain) mientras le roba media
// pantalla a la lista de personas de debajo. clamp() lo acota entre PHOTO_STAGE_MIN_HEIGHT_DVH
// (para que una foto muy panorámica no quede ridículamente baja) y PHOTO_STAGE_MAX_HEIGHT_DVH
// (más bajo que el 50dvh original, a propósito, para dejar más aire a los radio buttons de la
// lista incluso con fotos portrait).
export function ContributionSuggestionScreen({
  photo,
  personas,
  selectedIds,
  onToggle,
  onSkip,
  onSave,
  onConfirmNoPersonas,
  isSubmitting = false,
}: ContributionSuggestionScreenProps) {
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const aspectRatio = usePhotoAspectRatio(photo.fullUrl);

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

      {/* z-[9]: justo debajo del z-10 de PageHeader, igual que la franja de pestañas de
          Tabbar — sin esto, la lista de personas (después en el DOM) pintaría por encima de
          la foto al pasar por debajo mientras hace scroll. */}
      <div
        data-testid="photo-stage-panel"
        className="sticky z-[9] flex overflow-hidden bg-foreground/95"
        style={{ top: headerHeight, height: photoStageHeight(aspectRatio) }}
      >
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
        <h2 className="text-base font-medium text-foreground mb-3">¿Quién sale en esta foto?</h2>

        <div className="space-y-2">
          <PersonaSelectionList personas={personas} selectedIds={selectedIds} onToggle={onToggle} disabled={isSubmitting} />
        </div>
      </PageContainer>

      {/* Sticky abajo, mismo patrón que el input de AiChatScreen. El ghost "No hay nadie en
          esta foto" es distinto de "Ahora no" del header: "Ahora no" pospone la pregunta,
          esto la resuelve para siempre (foto sin PhotoPersonaTag pero ya no candidata). */}
      <div className="sticky bottom-0 pb-safe bg-background/80 backdrop-blur-sm border-t border-border">
        <PageContainer className="py-4 space-y-2">
          <Button variant="ghost" fullWidth onClick={onConfirmNoPersonas} disabled={isSubmitting}>
            No hay nadie en esta foto
          </Button>
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
    </div>
  );
}
