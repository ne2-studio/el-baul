import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';
import { Recuerdo } from '@/types';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadRecuerdos, addRecuerdo, editRecuerdo } from '@/features/memories/useCases';
import { loadTaggedPersonas } from '@/features/photos/useCases';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { usePersonaScope } from '@/hooks/usePersonaScope';
import { api } from '@/api';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';
import { closePhotoViewer, getBackgroundLocation, navigateToPhotoInViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// Variante de PhotoViewerRoute que recorre las fotos etiquetadas de una persona concreta en
// vez de las de un capítulo — cruza capítulos libremente, así que las acciones que dependen
// de "en qué capítulo estoy" (mover, cambiar fecha, retirar, portadas) quedan fuera; lo demás
// (cerrar, anterior/siguiente, recuerdos, etiquetado, descarga, compartir, navegar a otra
// persona) se mantiene igual que en el visor normal.
export const PersonaPhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, personaId, photoId } = useParams();
  const auth = useAuth();
  const { run } = useAsyncAction();
  const sharedLinksEnabled = useAppConfigStore(state => state.sharedLinksEnabled);
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const backgroundLocation = getBackgroundLocation(location);

  const { baul, isLoading: isLoadingBaul, refreshFailed, retry } = useBaulScope(baulId);
  const { personas, taggedPersonas } = usePersonasStore();
  const { recuerdos } = useRecuerdosStore();

  // Precarga la persona y sus fotos etiquetadas — bloqueando hasta tener ambas — igual que
  // PersonaDetailRoute, para no duplicar aquí la misma lógica de recuperación.
  const { photos: personaPhotos, isLoading: isLoadingPersona, loadFailed: personaPhotosFailed, retry: retryPersona } = usePersonaScope(baulId, personaId);

  useEffect(() => {
    if (auth.isAuthenticated && photoId) {
      // Distinct keys — see PhotoViewerRoute for why two unkeyed run() calls in the same
      // effect flush would otherwise silently collide.
      run(() => loadRecuerdos(photoId), { key: 'recuerdos', errorMessage: 'No se pudieron cargar los recuerdos' });
      run(() => loadTaggedPersonas(photoId), { key: 'tagged-personas', errorMessage: 'No se pudieron cargar las personas etiquetadas' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, photoId, loadRecuerdos, loadTaggedPersonas]);

  if (isLoadingBaul || isLoadingPersona) return <div className="p-8 text-center">Cargando foto...</div>;

  if (!baul) {
    if (refreshFailed) {
      return (
        <ErrorScreen
          title="No se ha podido cargar el baúl"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={retry}
        />
      );
    }
    return <div className="p-8 text-center">No se ha encontrado el baúl.</div>;
  }

  if (!personaId) return <div className="p-8 text-center">No se ha encontrado la persona.</div>;

  if (!personaPhotos) {
    if (personaPhotosFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar las fotos"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={retryPersona}
        />
      );
    }
    return <div className="p-8 text-center">Cargando foto...</div>;
  }

  const photos = personaPhotos;
  const photo = photos.find(p => p.id === photoId);
  if (!photo) return <div className="p-8 text-center">No se ha encontrado la foto.</div>;

  const basePath = `/baules/${baul.id}/personas/${personaId}`;

  const closeViewer = () => closePhotoViewer(navigate, backgroundLocation, basePath);

  const handleAddRecuerdo = async (photoId: string, text: string) => {
    if (!auth.isAuthenticated) return;
    await run(() => addRecuerdo(baul.id, photoId, text), { errorMessage: 'Error al añadir el recuerdo' });
  };

  const handleEditRecuerdo = async (recuerdo: Recuerdo, text: string): Promise<boolean> => {
    if (!auth.isAuthenticated) return false;
    const result = await run(() => editRecuerdo(recuerdo.id, text), {
      successMessage: 'Recuerdo actualizado',
      errorMessage: 'Error al guardar el recuerdo',
    });
    return result.ok;
  };

  const handleShareRecuerdo = async (recuerdo: Recuerdo) => {
    const result = await run(() => api.recuerdos.createShareLink(recuerdo.id), {
      key: 'share-recuerdo',
      errorMessage: 'Error al crear el enlace',
    });
    if (!result.ok) return;

    await sharePublicLink({
      title: `Recuerdo de ${baul.name}`,
      text: `Te comparto un recuerdo de "${baul.name}" en El Baúl.`,
      url: result.value.url,
      onCopied: () => showToastMessage('Enlace copiado al portapapeles'),
    });
  };

  return (
    <PhotoViewer
      photo={photo}
      photos={photos}
      onClose={closeViewer}
      onPhotoChange={(newPhoto) => navigateToPhotoInViewer(navigate, backgroundLocation, photoViewerPath(basePath, newPhoto.id))}
      baulId={baul.id}
      baulName={baul.name}
      sharedLinksEnabled={sharedLinksEnabled}
      baulPersonas={personas[baul.id] || []}
      taggedPersonas={taggedPersonas[photo.id] || []}
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(clickedPersonaId) => navigate(`/baules/${baul.id}/personas/${clickedPersonaId}`)}
      onShareRecuerdo={sharedLinksEnabled ? handleShareRecuerdo : undefined}
      onEditRecuerdo={handleEditRecuerdo}
    />
  );
};
