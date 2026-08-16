import { useState } from 'react';
import { ContributionSuggestionScreen } from '@/features/contributions/components/ContributionSuggestionScreen';
import { confirmPhotoHasNoPersonas, setTaggedPersonas } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { usePersonasStore } from '@/store/usePersonasStore';
import { Photo } from '@/types';

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
    const result = await run(() => confirmPhotoHasNoPersonas(photo.id), {
      successMessage: 'Anotado — no volveremos a preguntar por esta foto',
      errorMessage: 'No se pudo guardar',
    });
    if (result.ok) onResolved();
  };

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
