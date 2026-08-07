import { useEffect, useState } from 'react';
import { api } from '@/api';
import { FullScreenLoading } from '@/design-system/components/feedback/FullScreenLoading';
import { ContributionSuggestionScreen } from '@/features/photos/components/ContributionSuggestionScreen';
import { setTaggedPersonas } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { usePersonasStore } from '@/store/usePersonasStore';
import { Photo } from '@/types';

interface ContributionSuggestionContainerProps {
  baulId: string;
  // Llamado tanto al guardar como al pulsar "Ahora no" como cuando no hay ninguna foto
  // candidata — en los tres casos BaulRoute debe dejar paso al feed normal.
  onResolved: () => void;
}

// Gate que BaulRoute renderiza en vez de su feed la primera vez que se entra en un baúl esta
// sesión — ver BaulRoute para la condición exacta de cuándo se monta. Pide la foto candidata
// directamente vía api.* en vez de a través de un store: es un dato que se usa una única vez y
// nunca se comparte entre pantallas, la misma excepción que ya cubre a los Route (ver
// docs/architecture/frontend.md) — aquí se aplica un nivel más abajo porque es este container,
// no BaulRoute, quien la necesita. Si falla la petición, se resuelve en silencio hacia el feed
// en vez de bloquear la entrada al baúl por una recomendación que es, por definición, opcional.
export function ContributionSuggestionContainer({ baulId, onResolved }: ContributionSuggestionContainerProps) {
  const { personas } = usePersonasStore();
  const baulPersonas = personas[baulId] || [];
  const [photo, setPhoto] = useState<Photo | null | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { run, isPending } = useAsyncAction();

  // onResolved deliberately isn't a dependency here: BaulRoute passes a fresh inline closure
  // on every render (it re-renders whenever any of the whole-store subscriptions it reads —
  // chapters/personas/baulRecuerdos — change, which happens repeatedly right after entering a
  // baúl while useBaulScope's loads are still settling). A previous version watched `photo` in
  // a second effect keyed on `[photo, onResolved]`, which re-fired on every one of those
  // parent re-renders and called onResolved() again each time — each call synchronously
  // notifies uiStore's listeners, which re-triggers this effect before the resulting re-render
  // even commits, tripping React's "Maximum update depth exceeded" (#185) safety net. Calling
  // onResolved() exactly once, straight out of the fetch's own resolution, has no such loop.
  useEffect(() => {
    let cancelled = false;
    api.photos.getUntaggedSuggestion(baulId)
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

  const toggle = (personaId: string) =>
    setSelectedIds((ids) => (ids.includes(personaId) ? ids.filter((id) => id !== personaId) : [...ids, personaId]));

  const handleSave = async () => {
    if (!photo || selectedIds.length === 0) return;
    const result = await run(() => setTaggedPersonas(photo.id, selectedIds), {
      successMessage: 'Gracias por ayudar a recordar. Tu familia te lo agradece',
      errorMessage: 'No se pudieron guardar las personas etiquetadas',
    });
    if (result.ok) onResolved();
  };

  if (photo === undefined) return <FullScreenLoading message="Abriendo baúl..." />;
  if (photo === null) return null;

  return (
    <ContributionSuggestionScreen
      photo={photo}
      personas={baulPersonas}
      selectedIds={selectedIds}
      onToggle={toggle}
      onSkip={onResolved}
      onSave={handleSave}
      isSubmitting={isPending()}
    />
  );
}
