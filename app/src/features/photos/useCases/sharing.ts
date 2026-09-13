import { api } from '@/api';

// "Añadir a otro baúl" (docs/.backlog issue #62, Slice 2): crea una foto nueva en el baúl
// destino que comparte el mismo archivo/PhotoAsset que la foto de origen — nada se sube ni se
// copia en el almacenamiento. A diferencia de deletePhoto/changePhotoDate, no toca
// usePhotosStore/useBaulesStore: la foto nueva vive en un baúl distinto al que el visor actual
// tiene abierto, así que no hay ninguna caché local que actualizar aquí — la próxima vez que se
// abra ese otro baúl, su propia carga la traerá.
export async function addPhotoToBaul(sourcePhotoId: string, targetBaulId: string) {
  return api.photos.addToBaul(sourcePhotoId, targetBaulId);
}

// Versión en lote de addPhotoToBaul, para la selección múltiple (docs/.backlog issue #62,
// extensión de Slice 2). Misma estrategia que movePhotos: no hay endpoint de lote en la API —
// una petición por foto con su propio try/catch, para que un fallo a mitad de lote no aborte el
// resto. A diferencia de movePhotos, no hay nada que reconciliar en el store al terminar: el
// baúl destino es distinto del que el usuario tiene abierto, así que no hay caché local que
// actualizar aquí (ver el comentario de addPhotoToBaul de más arriba).
export async function addPhotosToBaul(
  photoIds: string[],
  targetBaulId: string,
  onItemSettled?: (result: { photoId: string; error?: string }) => void
): Promise<void> {
  let succeededCount = 0;
  let failedCount = 0;
  for (const photoId of photoIds) {
    try {
      await api.photos.addToBaul(photoId, targetBaulId);
      succeededCount += 1;
      onItemSettled?.({ photoId });
    } catch (error) {
      failedCount += 1;
      onItemSettled?.({ photoId, error: error instanceof Error ? error.message : 'No se pudo añadir la foto' });
    }
  }

  if (succeededCount === 0) {
    throw new Error(`No se pudo añadir ninguna de las ${photoIds.length} fotos`);
  }
  if (failedCount > 0) {
    throw new Error(`${failedCount} de ${photoIds.length} fotos no se pudieron añadir`);
  }
}
