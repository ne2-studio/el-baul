import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PhotoViewerContainer } from '@/features/photos/containers/PhotoViewerContainer';
import { useBaulesStore } from '@/store/useBaulesStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { closePhotoViewer, getBackgroundLocation, navigateToPhotoInViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// Visor para la pestaña "Fotos" del baúl (todas las fotos, todos los capítulos + sueltas) —
// variante de PersonaPhotoViewerRoute: igual que las fotos de una persona, cruza capítulos
// libremente, así que no hay apiChapterId/allChapters que ofrecer y por tanto no hay mover ni
// portada de capítulo (esas viven en ChapterPhotoViewerContainer). Todo lo demás — tag/share/
// download, portada de baúl, fecha, retirar/solicitar retirada, recuerdos — es universal y
// vive en PhotoViewerContainer, el mismo que usa el resto de visores.
//
// A diferencia de los demás visores, no hace fetch propio: solo muestra las fotos que la
// pestaña ya cargó (useBaulesStore.baulPhotos/loosePhotos, según qué filtro — "Todas" o "Sin
// capítulo" — estuviera activo en BaulPhotosTabContainer cuando se abrió la foto) — deslizar
// más allá de lo ya cargado no está soportado en v1 (ver el hallazgo de refinamiento del issue
// #57: "limitar el swipe a lo que el grid ya haya cargado, sin fetch-on-swipe"). Por eso baulId
// no fuerza aquí ninguna carga adicional — si ninguna de las dos listas ya cargadas contuviera
// la foto (solo posible con un enlace directo a esta ruta sin haber abierto antes la pestaña),
// se cae al mismo "no encontrada" que un id inexistente.
export const BaulPhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, photoId } = useParams();

  const backgroundLocation = getBackgroundLocation(location);

  const baulScope = useBaulScope(baulId);
  const { chapters } = baulScope;
  const { baulPhotos, loosePhotos } = useBaulesStore();
  const photosById = usePhotosStore((state) => state.photosById);

  const guard = guardBaulScope(baulScope, { loadingLabel: 'Cargando foto...' });
  if (!guard.ready) return guard.screen;
  const { baul } = guard;

  // La foto puede venir de cualquiera de las dos listas que la tab "Fotos" puede tener
  // cargadas — se usa la que de verdad la contenga como conjunto para el swipe, así que
  // deslizar se queda dentro del mismo filtro con el que se abrió la foto.
  const allPhotos = hydratePhotos(baulPhotos[baul.id], photosById) || [];
  const loosePhotosList = hydratePhotos(loosePhotos[baul.id], photosById) || [];
  const photos = allPhotos.some((p) => p.id === photoId) ? allPhotos : loosePhotosList;
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) return <div className="p-8 text-center">No se ha encontrado la foto.</div>;

  const basePath = `/baules/${baul.id}/fotos`;
  const closeViewer = () => closePhotoViewer(navigate, backgroundLocation, `/baules/${baul.id}`);

  // Las fotos de esta pestaña cruzan capítulos libremente (ver comentario de cabecera), así
  // que el nombre del capítulo de cada foto se resuelve aquí cruzando su chapterId contra la
  // lista de capítulos del baúl, ya cargada por useBaulScope — mismo patrón que
  // PersonaPhotoViewerRoute.
  const chapterName = photo.chapterId ? chapters?.find((c) => c.id === photo.chapterId)?.name : undefined;

  return (
    <PhotoViewerContainer
      photo={photo}
      photos={photos}
      baulId={baul.id}
      baulName={baul.name}
      onClose={closeViewer}
      onPhotoChange={(newPhoto) => navigateToPhotoInViewer(navigate, backgroundLocation, photoViewerPath(basePath, newPhoto.id))}
      chapterName={chapterName}
    />
  );
};
