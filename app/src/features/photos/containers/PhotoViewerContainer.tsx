import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';
import { PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { loadRecuerdos } from '@/features/memories/useCases';
import { loadTaggedPersonas } from '@/features/photos/useCases';
import { usePhotoViewerActions } from '@/features/photos/containers/usePhotoViewerActions';

interface PhotoViewerContainerProps {
  photo: Photo;
  photos: Photo[];
  baulId: string;
  baulName: string;
  isAdmin?: boolean;
  /** Contexto de ruta (backgroundLocation/basePath) — se queda del lado de la Route. */
  onClose: () => void;
  onPhotoChange: (photo: Photo) => void;
  /** Acciones que solo tienen sentido para quien nos monta (p.ej. mover de capítulo, portada
   * de capítulo — exclusivas de ChapterPhotoViewerContainer). Este container es universal:
   * no sabe nada de capítulos, ni recibe ningún chapterId. */
  extraMenuItems?: PhotoViewerMenuItem[];
}

// Lógica de visor de fotos común a cualquier colección (capítulo, fotos sueltas, fotos
// etiquetadas de una persona, o cualquier filtro futuro) — habla con servidor y deja
// PhotoViewer (su único caller) 100% puro. Solo recibe la lista de fotos a mostrar; nunca un
// chapterId — si alguna acción lo necesita, quien nos monta la inyecta vía extraMenuItems
// (ver ChapterPhotoViewerContainer).
export function PhotoViewerContainer({
  photo, photos, baulId, baulName, isAdmin, onClose, onPhotoChange, extraMenuItems,
}: PhotoViewerContainerProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { run } = useAsyncAction();
  const sharedLinksEnabled = useAppConfigStore((state) => state.sharedLinksEnabled);
  const { personas, taggedPersonas } = usePersonasStore();
  const { recuerdos } = useRecuerdosStore();

  useEffect(() => {
    if (auth.isAuthenticated) {
      // Distinct keys — useAsyncAction.run() shares a single default key across calls with
      // no explicit one, so two unkeyed run() calls fired in the same effect flush collide:
      // the second silently short-circuits as "already-pending" instead of actually running.
      run(() => loadRecuerdos(photo.id), { key: 'recuerdos', errorMessage: 'No se pudieron cargar los recuerdos' });
      run(() => loadTaggedPersonas(photo.id), { key: 'tagged-personas', errorMessage: 'No se pudieron cargar las personas etiquetadas' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, photo.id, loadRecuerdos, loadTaggedPersonas]);

  const { buildMenuItems, canChangeDate, openDateModal, modals, onAddRecuerdo, onEditRecuerdo, onShareRecuerdo } = usePhotoViewerActions({
    baulId,
    baulName,
    photo,
    isAdmin,
    sharedLinksEnabled,
    baulPersonas: personas[baulId] || [],
    taggedPersonas: taggedPersonas[photo.id] || [],
    onDeleted: onClose,
  });

  return (
    <PhotoViewer
      photo={photo}
      photos={photos}
      onClose={onClose}
      onPhotoChange={onPhotoChange}
      menuItems={buildMenuItems(extraMenuItems)}
      canChangeDate={canChangeDate}
      openDateModal={openDateModal}
      modals={modals}
      taggedPersonas={taggedPersonas[photo.id] || []}
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={onAddRecuerdo}
      onUserClick={(personaId) => navigate(`/baules/${baulId}/personas/${personaId}`)}
      onShareRecuerdo={sharedLinksEnabled ? onShareRecuerdo : undefined}
      onEditRecuerdo={onEditRecuerdo}
    />
  );
}
