import { useEffect, useState } from 'react';
import { api } from '@/api';
import { FullScreenLoading } from '@/design-system/components/feedback/FullScreenLoading';
import { WriteMemorySuggestionScreen } from '@/features/memories/components/WriteMemorySuggestionScreen';
import { addRecuerdo } from '@/features/memories/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Photo } from '@/types';

interface WriteMemorySuggestionContainerProps {
  baulId: string;
  // Ver mismo contrato en ContributionSuggestionContainer: se llama tanto al guardar como al
  // pulsar "Ahora no" como cuando no hay ninguna foto candidata.
  onResolved: () => void;
}

// Hermana de ContributionSuggestionContainer ("etiqueta personas") para la otra recomendación
// de contribución del baúl, "escribe un recuerdo" — ver BaulRoute para cómo alterna entre las
// dos. Mismo patrón de datos (fetch directo vía api.* en el efecto de montaje, resolución
// silenciosa hacia el feed si falla o no hay candidata) por el mismo motivo: la foto candidata
// es un dato de un solo uso, no compartido entre pantallas.
export function WriteMemorySuggestionContainer({ baulId, onResolved }: WriteMemorySuggestionContainerProps) {
  const [photo, setPhoto] = useState<Photo | null | undefined>(undefined);
  const { run, isPending } = useAsyncAction();

  // onResolved deliberadamente no es dependencia — mismo motivo que ContributionSuggestionContainer.
  useEffect(() => {
    let cancelled = false;
    api.photos.getMemorySuggestion(baulId)
      .then((result) => {
        if (cancelled) return;
        setPhoto(result);
        if (result === null) onResolved();
      })
      .catch(() => {
        if (cancelled) return;
        setPhoto(null);
        onResolved();
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId]);

  const handleSave = async (text: string) => {
    if (!photo) return;
    const result = await run(() => addRecuerdo(baulId, photo.id, text), {
      successMessage: 'Gracias por ayudar a recordar. Tu familia te lo agradece',
      errorMessage: 'No se pudo guardar el recuerdo',
    });
    if (result.ok) onResolved();
  };

  if (photo === undefined) return <FullScreenLoading message="Abriendo baúl..." />;
  if (photo === null) return null;

  return (
    <WriteMemorySuggestionScreen photo={photo} onSkip={onResolved} onSave={handleSave} isSubmitting={isPending()} />
  );
}
