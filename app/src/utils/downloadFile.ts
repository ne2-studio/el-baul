import { Capacitor } from '@capacitor/core';
import { Media } from '@capacitor-community/media';

const GALLERY_ALBUM_NAME = 'El Baúl';

function downloadBlobInBrowser(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// El identificador de álbum es obligatorio en Android (no así en iOS, que no usamos) —
// se reutiliza el álbum "El Baúl" si ya existe, o se crea la primera vez.
async function getOrCreateGalleryAlbumId(): Promise<string> {
  const { albums } = await Media.getAlbums();
  const existing = albums.find((a) => a.name === GALLERY_ALBUM_NAME);
  if (existing) return existing.identifier;

  await Media.createAlbum({ name: GALLERY_ALBUM_NAME });
  const { albums: refreshed } = await Media.getAlbums();
  const created = refreshed.find((a) => a.name === GALLERY_ALBUM_NAME);
  if (!created) throw new Error(`No se pudo crear el álbum "${GALLERY_ALBUM_NAME}"`);
  return created.identifier;
}

/**
 * En Android nativo guarda la foto directamente en la galería del dispositivo (álbum
 * "El Baúl"); en web dispara la descarga normal del navegador.
 */
export async function saveDownloadedPhoto(blob: Blob, fileName: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    downloadBlobInBrowser(blob, fileName);
    return;
  }

  const [dataUri, albumIdentifier] = await Promise.all([blobToDataUri(blob), getOrCreateGalleryAlbumId()]);
  await Media.savePhoto({ path: dataUri, albumIdentifier, fileName: fileName.replace(/\.[^./]+$/, '') });
}
