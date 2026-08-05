import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { ImageIcon } from 'lucide-react';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { loadPersonaPhotos } from '@/features/people/useCases';

interface PersonaFotosTabContainerProps {
  baulId: string;
  personaId: string;
  // Necesita resolvePhotoViewer's location/backgroundLocation — route-context-dependent, así
  // que se queda como callback de PersonaDetailRoute en vez de auto-navegar.
  onSelectPhoto: (photo: Photo) => void;
}

// Self-sufficient tab: carga y lee las fotos etiquetadas de esta persona ella misma — nada
// más las precarga, a diferencia de chapters/personas del baúl (que useBaulScope ya deja en
// caché) — ver la regla de containers/ en docs/architecture/frontend.md.
export function PersonaFotosTabContainer({ baulId, personaId, onSelectPhoto }: PersonaFotosTabContainerProps) {
  const auth = useAuth();
  const { personaPhotos } = usePersonasStore();
  const { run } = useAsyncAction();

  useEffect(() => {
    if (auth.isAuthenticated && !personaPhotos[personaId]) {
      run(() => loadPersonaPhotos(baulId, personaId), { key: 'persona-photos', errorMessage: 'Error al cargar las fotos' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, baulId, personaId, personaPhotos, loadPersonaPhotos]);

  const photos = personaPhotos[personaId] || [];

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />}
        title="Todavía no hay fotos"
        subtitle="Las fotos en las que etiquetes a esta persona aparecerán aquí"
      />
    );
  }

  return <PhotoSwimlanes photos={photos} onSelectPhoto={onSelectPhoto} />;
}
