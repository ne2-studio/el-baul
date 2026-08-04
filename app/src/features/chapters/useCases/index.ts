import { api } from '@/api';

// No hay estado que actualizar: la cuadrícula de fotos no muestra chips de personas
// etiquetadas (solo el visor de una foto lo hace, vía taggedPersonas).
export async function addTaggedPersonasBatch(baulId: string, photoIds: string[], personaIds: string[]): Promise<void> {
  await api.photos.addTaggedPersonasBatch(baulId, photoIds, personaIds);
}
