import { api } from '@/api';
import { useMyPhotosStore } from '@/store/useMyPhotosStore';

// "Quitar de Mis fotos" (Slice 5, docs/.backlog issue #62) — soft-deletes solo la relación
// UserPhotoAsset del usuario actual con este asset, vía una única petición al backend. Nunca
// afecta al PhotoAsset, a ninguna Photo en un baúl, ni a la relación de otro usuario.
export async function removeFromMyPhotos(assetId: string): Promise<void> {
  await api.myPhotos.remove(assetId);
  useMyPhotosStore.getState().removeAssets([assetId]);
}

// Contraparte en lote, para la selección múltiple de Mis fotos.
export async function removePhotosFromMyPhotos(assetIds: string[]): Promise<void> {
  await api.myPhotos.removeBatch(assetIds);
  useMyPhotosStore.getState().removeAssets(assetIds);
}

// "Añadir a un baúl" en lote desde la selección múltiple de Mis fotos (Slice 5) — una única
// petición al backend, que trata un asset ya presente en el baúl destino como éxito (ver
// PhotoManager.AddAssetsToBaulBatchAsync), no como error.
export async function addPhotoAssetsToBaulBatch(assetIds: string[], targetBaulId: string): Promise<void> {
  const appearances = await api.myPhotos.addToBaulBatch(assetIds, targetBaulId);
  if (appearances.length === 0) return;

  // Todas las apariciones devueltas apuntan al mismo targetBaulId (una sola llamada, un solo
  // destino), así que basta con fusionar la primera en cada asset de la selección — sin
  // distinguir cuál de los assetIds falló individualmente (solo puede ocurrir si el propio
  // usuario ya no tuviera ese asset en Mis fotos, algo que la UI nunca ofrece seleccionar).
  const store = useMyPhotosStore.getState();
  assetIds.forEach((assetId) => store.addBaulAppearance(assetId, appearances[0]));
}

// "Guardar en Mis fotos" desde un baúl (Slice 5, docs/.backlog issue #62) — crea o reactiva la
// relación UserPhotoAsset del usuario actual con el PhotoAsset de esta foto. A diferencia de
// removeFromMyPhotos/addPhotoAssetsToBaulBatch, no toca useMyPhotosStore: el usuario está viendo
// un baúl, no Mis fotos, así que no hay ninguna caché local que reconciliar aquí (mismo criterio
// que addPhotoToBaul en sharing.ts) — la próxima vez que abra Mis fotos, su propia carga lo trae.
export async function saveToMyPhotos(photoId: string): Promise<void> {
  await api.photos.saveToMyPhotos(photoId);
}

// Contraparte en lote, para la selección múltiple de un baúl.
export async function saveToMyPhotosBatch(photoIds: string[]): Promise<void> {
  await api.photos.saveToMyPhotosBatch(photoIds);
}
