import { WriteMemorySuggestionScreen } from '@/features/contributions/components/WriteMemorySuggestionScreen';
import { addRecuerdo } from '@/features/memories/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Photo } from '@/types';

interface WriteMemorySuggestionContainerProps {
  baulId: string;
  // La foto candidata ya viene resuelta por ContributionSuggestionGateContainer — ver el mismo
  // contrato en ContributionSuggestionContainer.
  photo: Photo;
  // Ver mismo contrato en ContributionSuggestionContainer: se llama tanto al guardar como al
  // pulsar "Ahora no".
  onResolved: () => void;
  // Ver WriteMemorySuggestionScreen. Pasado por ContributionSuggestionContainer cuando reusa
  // esta pantalla como fallback de "no hay nadie en esta foto" — normalmente indefinido (sin
  // subtítulo) cuando el backend sugiere directamente el tipo "memory".
  subtitle?: string;
}

// Hermana de ContributionSuggestionContainer ("etiqueta personas") para la otra recomendación de
// contribución del baúl, "escribe un recuerdo" — ver ContributionSuggestionGateContainer para
// cómo se elige entre las dos (decisión del backend, no de aquí).
export function WriteMemorySuggestionContainer({ baulId, photo, onResolved, subtitle }: WriteMemorySuggestionContainerProps) {
  const { run, isPending } = useAsyncAction();

  const handleSave = async (text: string) => {
    const result = await run(() => addRecuerdo(baulId, photo.id, text), {
      successMessage: 'Gracias por ayudar a recordar. Tu familia te lo agradece',
      errorMessage: 'No se pudo guardar el recuerdo',
    });
    if (result.ok) onResolved();
  };

  return (
    <WriteMemorySuggestionScreen
      photo={photo}
      onSkip={onResolved}
      onSave={handleSave}
      isSubmitting={isPending()}
      subtitle={subtitle}
    />
  );
}
