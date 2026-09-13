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
