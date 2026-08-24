import { useState } from 'react';
import { ContributionSuggestionScreen } from '@/features/contributions/components/ContributionSuggestionScreen';
import { WriteMemorySuggestionContainer } from '@/features/contributions/containers/WriteMemorySuggestionContainer';
import { confirmPhotoHasNoPersonas, setTaggedPersonas } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { usePersonasStore } from '@/store/usePersonasStore';
import { Photo } from '@/types';

// Subtexto de WriteMemorySuggestionScreen cuando esta pantalla se reconvierte en ella tras "no
// hay nadie en esta foto" — ver handleConfirmNoPersonas más abajo.
const NO_PERSONAS_MEMORY_SUBTITLE = 'Describe la foto o cuéntanos por qué es importante';

interface ContributionSuggestionContainerProps {
  baulId: string;
  // La foto candidata ya viene resuelta por ContributionSuggestionGateContainer (que la pide junto
  // al tipo de sugerencia en una sola llamada al backend) — este container ya no hace su propio
  // fetch, solo articula la interacción de "etiquetar personas" sobre ella.
  photo: Photo;
  // Llamado tanto al guardar como al pulsar "Ahora no" — en ambos casos BaulRoute debe dejar paso
  // al feed normal.
  onResolved: () => void;
}

export function ContributionSuggestionContainer({ baulId, photo, onResolved }: ContributionSuggestionContainerProps) {
  const { personas } = usePersonasStore();
  const baulPersonas = personas[baulId] || [];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Una vez confirmado "no hay nadie en esta foto" no volvemos al feed (onResolved) salvo que la
  // foto ya tenga recuerdos (photo.recuerdoCount > 0): en ese caso no hay nada más que pedir. Si
  // no tiene recuerdos, reconvertimos esta misma foto candidata en una sugerencia de "escribe un
  // recuerdo" — ver NO_PERSONAS_MEMORY_SUBTITLE. Todo en cliente, el backend ya conoce la foto y
  // ya sabe que no tiene personas (confirmPhotoHasNoPersonas ya se llamó).
  const [showMemoryFallback, setShowMemoryFallback] = useState(false);
  const { run, isPending } = useAsyncAction();

  const toggle = (personaId: string) =>
    setSelectedIds((ids) => (ids.includes(personaId) ? ids.filter((id) => id !== personaId) : [...ids, personaId]));

  const handleSave = async () => {
    if (selectedIds.length === 0) return;
    const result = await run(() => setTaggedPersonas(photo.id, selectedIds), {
      successMessage: 'Gracias por ayudar a recordar. Tu familia te lo agradece',
      errorMessage: 'No se pudieron guardar las personas etiquetadas',
    });
    if (result.ok) onResolved();
  };

  const handleConfirmNoPersonas = async () => {
    // Sin successMessage: a diferencia de handleSave, esta acción no cierra la sugerencia de
    // inmediato cuando hay fallback de "escribe un recuerdo" — un toast de "no volveremos a
    // preguntar" sería confuso justo cuando aparece una pregunta nueva. Si en cambio la foto ya
    // tiene recuerdos, cerramos sin fallback ni toast, igual que "Ahora no".
    const result = await run(() => confirmPhotoHasNoPersonas(photo.id), {
      errorMessage: 'No se pudo guardar',
    });
    if (!result.ok) return;
    if (photo.recuerdoCount > 0) {
      onResolved();
      return;
    }
    setShowMemoryFallback(true);
  };

  if (showMemoryFallback) {
    return (
      <WriteMemorySuggestionContainer
        baulId={baulId}
        photo={photo}
        onResolved={onResolved}
        subtitle={NO_PERSONAS_MEMORY_SUBTITLE}
      />
    );
  }

  return (
    <ContributionSuggestionScreen
      photo={photo}
      personas={baulPersonas}
      selectedIds={selectedIds}
      onToggle={toggle}
      onSkip={onResolved}
      onSave={handleSave}
      onConfirmNoPersonas={handleConfirmNoPersonas}
      isSubmitting={isPending()}
    />
  );
}
