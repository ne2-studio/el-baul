import { useEffect, useState } from 'react';
import { api } from '@/api';
import type { ContributionSuggestion } from '@/api/resources/contributions';
import { FullScreenLoading } from '@/design-system/components/feedback/FullScreenLoading';
import { ContributionSuggestionContainer } from './ContributionSuggestionContainer';
import { WriteMemorySuggestionContainer } from './WriteMemorySuggestionContainer';

interface ContributionSuggestionGateContainerProps {
  baulId: string;
  // Llamado tanto al resolver la sugerencia (guardar/"ahora no") como cuando el backend no
  // devuelve ninguna — en ambos casos BaulRoute debe dejar paso al feed normal.
  onResolved: () => void;
}

// Único punto que pregunta al backend "¿hay algo que sugerir?" — antes cada tipo (etiquetar
// personas, escribir un recuerdo) se elegía al azar aquí en el cliente y cada uno pedía su propia
// foto candidata por separado (dos requests, con la probabilidad y el "qué tipo" decididos en el
// front). Ahora el backend (dominio Contributions) decide tipo + foto + si hay alguna en una sola
// llamada; este container solo pinta lo que llega. BaulRoute sigue decidiendo *cuándo* preguntar
// (cooldown, primera sesión, punto de entrada) — eso es estado de navegación/dispositivo, no
// lógica de negocio de la sugerencia.
export function ContributionSuggestionGateContainer({ baulId, onResolved }: ContributionSuggestionGateContainerProps) {
  const [suggestion, setSuggestion] = useState<ContributionSuggestion | null | undefined>(undefined);

  // onResolved deliberadamente no es dependencia — mismo motivo que documentan
  // ContributionSuggestionContainer/WriteMemorySuggestionContainer: BaulRoute pasa un closure
  // nuevo en cada render y volver a disparar este efecto por eso reentraría en un bucle.
  useEffect(() => {
    let cancelled = false;
    api.contributions.getSuggestion(baulId)
      .then((result) => {
        if (cancelled) return;
        setSuggestion(result);
        if (result === null) onResolved();
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestion(null);
        onResolved();
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId]);

  if (suggestion === undefined) return <FullScreenLoading message="Abriendo baúl..." />;
  if (suggestion === null) return null;

  if (suggestion.type === 'tag') {
    return <ContributionSuggestionContainer baulId={baulId} photo={suggestion.photo} onResolved={onResolved} />;
  }
  return <WriteMemorySuggestionContainer baulId={baulId} photo={suggestion.photo} onResolved={onResolved} />;
}
