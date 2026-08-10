import React from 'react';
import { ImageIcon } from 'lucide-react';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';

interface PersonaFotosTabContainerProps {
  personaId: string;
  // Necesita resolvePhotoViewer's location/backgroundLocation — route-context-dependent, así
  // que se queda como callback de PersonaDetailRoute en vez de auto-navegar.
  onSelectPhoto: (photo: Photo) => void;
}

// Self-sufficient tab: lee las fotos etiquetadas de esta persona de su propia store slice.
// No las precarga ella misma — PersonaDetailRoute (su único caller) ya las deja en caché vía
// usePersonaScope antes de montar esta pestaña, igual que BaulPersonasTabContainer con
// useBaulScope — ver la regla de containers/ en docs/architecture/frontend.md.
export function PersonaFotosTabContainer({ personaId, onSelectPhoto }: PersonaFotosTabContainerProps) {
  const { personaPhotos } = usePersonasStore();
  const photosById = usePhotosStore((state) => state.photosById);
  const photos = hydratePhotos(personaPhotos[personaId], photosById) || [];

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
