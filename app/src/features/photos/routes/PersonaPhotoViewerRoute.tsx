import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';
import { Photo, Recuerdo } from '@/types';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadRecuerdos, addRecuerdo, editRecuerdo } from '@/features/memories/useCases';
import { loadPersonas, loadPersonaPhotos } from '@/features/people/useCases';
import { loadTaggedPersonas, setTaggedPersonas } from '@/features/photos/useCases';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { api } from '@/api';
import { saveDownloadedPhoto } from '@/utils/downloadFile';
import { Capacitor } from '@capacitor/core';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';
import { closePhotoViewer, getBackgroundLocation, navigateToPhotoInViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// Variante de PhotoViewerRoute que recorre las fotos etiquetadas de una persona concreta en
// vez de las de un capítulo — cruza capítulos libremente, así que las acciones que dependen
// de "en qué capítulo estoy" (mover, cambiar fecha, retirar, portadas) quedan fuera; lo demás
// (cerrar, anterior/siguiente, recuerdos, etiquetado, descarga, navegar a otra persona) se
// mantiene igual que en el visor normal.
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
  const { personas, personaPhotos, taggedPersonas } = usePersonasStore();
  const { recuerdos } = useRecuerdosStore();

  const [photosFailed, setPhotosFailed] = useState(false);

  const fetchPersonaPhotos = async () => {
    if (!baulId || !personaId) return;
    const result = await run(() => loadPersonaPhotos(baulId, personaId), { errorMessage: 'Error al cargar las fotos' });
    setPhotosFailed(!result.ok);
  };

  useEffect(() => {
    if (auth.isAuthenticated && personaId && !personaPhotos[personaId]) {
      fetchPersonaPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, baulId, personaId, personaPhotos, loadPersonaPhotos]);

  useEffect(() => {
    if (auth.isAuthenticated && baulId && !personas[baulId]) {
      run(() => loadPersonas(baulId), { key: 'personas', errorMessage: 'No se pudieron cargar las personas del baúl' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, baulId, personas, loadPersonas]);

  useEffect(() => {
    if (auth.isAuthenticated && photoId) {
      // Distinct keys — see PhotoViewerRoute for why two unkeyed run() calls in the same
      // effect flush would otherwise silently collide.
      run(() => loadRecuerdos(photoId), { key: 'recuerdos', errorMessage: 'No se pudieron cargar los recuerdos' });
      run(() => loadTaggedPersonas(photoId), { key: 'tagged-personas', errorMessage: 'No se pudieron cargar las personas etiquetadas' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, photoId, loadRecuerdos, loadTaggedPersonas]);

  if (isLoadingBaul) return <div className="p-8 text-center">Cargando foto...</div>;

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

  if (!personaPhotos[personaId]) {
    if (photosFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar las fotos"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={fetchPersonaPhotos}
        />
      );
    }
    return <div className="p-8 text-center">Cargando foto...</div>;
  }

  const photos = personaPhotos[personaId] || [];
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

  const handleSaveTags = async (photoToTag: Photo, personaIds: string[]): Promise<boolean> => {
    const result = await run(() => setTaggedPersonas(photoToTag.id, personaIds), {
      successMessage: 'Personas etiquetadas actualizadas',
      errorMessage: 'Error al etiquetar personas',
    });
    return result.ok;
  };

  const handleDownloadPhoto = async (photoToDownload: Photo) => {
    await run(async () => {
      const { blob, fileName } = await api.photos.download(photoToDownload.id);
      await saveDownloadedPhoto(blob, fileName);
    }, {
      successMessage: Capacitor.isNativePlatform() ? 'Foto guardada en la galería' : undefined,
      errorMessage: 'Error al descargar la foto',
    });
  };

  const handleSharePhoto = async (photoToShare: Photo) => {
    const result = await run(() => api.photos.createShareLink(photoToShare.id), {
      key: 'share-photo',
      errorMessage: 'Error al crear el enlace',
    });
    if (!result.ok) return;

    await sharePublicLink({
      title: `Foto de ${baul.name}`,
      text: `Te comparto una foto de "${baul.name}" en El Baúl.`,
      url: result.value.url,
      onCopied: () => showToastMessage('Enlace copiado al portapapeles'),
    });
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
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(clickedPersonaId) => navigate(`/baules/${baul.id}/personas/${clickedPersonaId}`)}
      onDownloadPhoto={handleDownloadPhoto}
      onSharePhoto={sharedLinksEnabled ? handleSharePhoto : undefined}
      onShareRecuerdo={sharedLinksEnabled ? handleShareRecuerdo : undefined}
      onEditRecuerdo={handleEditRecuerdo}
      taggedPersonas={taggedPersonas[photo.id] || []}
      baulPersonas={personas[baul.id] || []}
      onSaveTags={handleSaveTags}
    />
  );
};
