import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PhotoViewer } from '@/app/components/PhotoViewer';
import { Photo } from '@/app/components/PhotosView';
import { ErrorScreen } from '@/app/components/ErrorScreen';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { api } from '@/api';
import { saveDownloadedPhoto } from '@/utils/downloadFile';
import { Capacitor } from '@capacitor/core';

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

  const backgroundLocation = (location.state as { backgroundLocation?: typeof location } | null)?.backgroundLocation;

  const { baul, isLoading: isLoadingBaul, refreshFailed, retry } = useBaulScope(baulId);
  const {
    personas, loadPersonas, personaPhotos, loadPersonaPhotos, taggedPersonas, loadTaggedPersonas, setTaggedPersonas,
  } = usePersonasStore();
  const { recuerdos, loadRecuerdos, addRecuerdo } = useRecuerdosStore();

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

  const closeViewer = () => {
    if (backgroundLocation) navigate(-1);
    else navigate(basePath, { replace: true });
  };

  const handleAddRecuerdo = async (photoId: string, text: string) => {
    if (!auth.isAuthenticated) return;
    await run(() => addRecuerdo(baul.id, photoId, text), { errorMessage: 'Error al añadir el recuerdo' });
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

  return (
    <PhotoViewer
      photo={photo}
      photos={photos}
      onClose={closeViewer}
      onPhotoChange={(newPhoto) => navigate(`${basePath}/foto/${newPhoto.id}`, {
        replace: true,
        state: backgroundLocation ? { backgroundLocation } : undefined,
      })}
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(clickedPersonaId) => navigate(`/baules/${baul.id}/personas/${clickedPersonaId}`)}
      onDownloadPhoto={handleDownloadPhoto}
      taggedPersonas={taggedPersonas[photo.id] || []}
      baulPersonas={personas[baul.id] || []}
      onSaveTags={handleSaveTags}
    />
  );
};
