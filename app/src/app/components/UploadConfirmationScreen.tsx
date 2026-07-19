import React, { useState, useEffect, useRef } from 'react';
import exifr from 'exifr';
import * as Sentry from '@sentry/react';
import { Button } from './Button';
import { Input } from './Input';
import { ChevronLeft, X } from 'lucide-react';
import { Baul } from './BaulesList';
import { Album } from './AlbumsView';
import { ChapterSelector, ChapterSelection } from './ChapterSelector';
import { PartialDatePicker } from './PartialDatePicker';
import { PhotoDate } from '@/types';

export interface SelectedPhoto {
  id: string;
  file: File;
  preview: string;
  caption?: string;
}

// Reads a just-picked file into memory right away and wraps it in a fresh, Blob-backed
// File. On Android, `<input type=file>` grants Chrome only a transient content:// URI
// permission for the picked files — if the user takes a while getting through the
// chapter/date step before confirming, that grant can expire and later reads throw
// NotReadableError with zero server logs (seen in production). Reading the bytes now,
// while the grant is still fresh, avoids ever touching the OS file handle again.
export async function materializeSelectedPhoto(file: File): Promise<SelectedPhoto | null> {
  try {
    const buffer = await file.arrayBuffer();
    const materialized = new File([buffer], file.name, { type: file.type, lastModified: file.lastModified });
    return {
      id: crypto.randomUUID(),
      file: materialized,
      preview: URL.createObjectURL(materialized),
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { phase: 'read-file-on-select' },
      extra: { name: file.name, size: file.size, type: file.type },
    });
    return null;
  }
}

interface UploadConfirmationScreenProps {
  baul: Baul;
  album: Album;
  existingAlbums: Album[];
  /** Set only when entered from an already-open chapter — the chapter step is skipped
   * entirely and photos go straight into it, since the destination is already obvious. */
  currentAlbumId?: string;
  selectedPhotos: SelectedPhoto[];
  onBack: () => void;
  onUpload: (photos: SelectedPhoto[], caption: string | undefined, chapter: ChapterSelection, date: PhotoDate | null) => void;
}

// If every photo in the batch has EXIF DateTimeOriginal/CreateDate and they all agree
// on year/month/day, returns that date to pre-fill the picker — otherwise null. Mirrors
// the field priority the backend's ExifPhotoDateExtractor uses (DateTimeOriginal, then
// CreateDate/DateTimeDigitized), so the client pre-fill matches what the server would
// have extracted anyway had no explicit date been sent.
async function extractSharedExifDate(files: File[]): Promise<PhotoDate | null> {
  const dates = await Promise.all(files.map(async (file) => {
    try {
      const tags = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
      const date: Date | undefined = tags?.DateTimeOriginal ?? tags?.CreateDate;
      return date ? { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() } : null;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { phase: 'exif-parse-on-select' },
        extra: { name: file.name, size: file.size, type: file.type },
      });
      return null;
    }
  }));

  const found = dates.filter((d) => d !== null) as PhotoDate[];
  if (found.length === 0) return null;

  const first = found[0];
  const allAgree = found.every((d) => d.year === first.year && d.month === first.month && d.day === first.day);
  return allAgree ? first : null;
}

export function UploadConfirmationScreen({
  baul,
  album,
  existingAlbums,
  currentAlbumId,
  selectedPhotos,
  onBack,
  onUpload
}: UploadConfirmationScreenProps) {
  const [caption, setCaption] = useState('');
  const [photos, setPhotos] = useState(selectedPhotos);
  const [chapter, setChapter] = useState<ChapterSelection | null>(
    currentAlbumId ? { type: 'existing', albumId: currentAlbumId } : null
  );
  const [date, setDate] = useState<PhotoDate | null>(null);
  const [dontRemember, setDontRemember] = useState(false);
  const dateTouchedRef = useRef(false);
  const [exifPrefill, setExifPrefill] = useState<PhotoDate | null>(null);

  useEffect(() => {
    let cancelled = false;
    extractSharedExifDate(selectedPhotos.map((p) => p.file)).then((found) => {
      if (!cancelled && found && !dateTouchedRef.current) setExifPrefill(found);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  const chapterValid = chapter !== null && (chapter.type !== 'new' || chapter.name.trim().length > 0);
  const dateValid = dontRemember || !!date?.year;
  const canConfirm = chapterValid && dateValid;

  const handleConfirm = () => {
    if (!canConfirm || !chapter) return;
    onUpload(photos, caption || undefined, chapter, dontRemember ? null : date);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Volver</span>
          </button>
          <h1 className="text-3xl text-foreground mb-1">Añadir fotos al capítulo</h1>
          <p className="text-sm text-muted-foreground">{album.name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Photo count */}
        <div className="mb-6">
          <p className="text-center text-muted-foreground">
            {photos.length} {photos.length === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
          </p>
        </div>

        {/* Photo grid with remove option */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square group">
              <img
                src={photo.preview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg"
              />
              {/* Remove button */}
              <button
                onClick={() => handleRemovePhoto(photo.id)}
                className="absolute -top-2 -right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Capítulo — skipped when uploading straight into an already-open chapter */}
        {!currentAlbumId && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-foreground mb-3">Capítulo</h2>
            <ChapterSelector
              albums={existingAlbums}
              currentAlbumId={currentAlbumId}
              value={chapter}
              onChange={setChapter}
            />
          </div>
        )}

        {/* Fecha — "No me acuerdo" only makes sense when we don't already have a
            confident answer from EXIF */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-foreground mb-3">Fecha</h2>
          <PartialDatePicker
            key={exifPrefill ? 'exif' : 'initial'}
            initialValue={exifPrefill ?? undefined}
            allowUnknown={!exifPrefill}
            onChange={(v, unknown) => {
              dateTouchedRef.current = true;
              setDate(v);
              setDontRemember(unknown);
            }}
          />
        </div>

        {/* Optional caption */}
        <div className="mb-8">
          <Input
            label="Nota para estas fotos (opcional)"
            placeholder="Ej: Verano en la playa..."
            value={caption}
            onChange={setCaption}
            multiline
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Guardar recuerdos
          </Button>
          <Button variant="ghost" fullWidth onClick={onBack}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
