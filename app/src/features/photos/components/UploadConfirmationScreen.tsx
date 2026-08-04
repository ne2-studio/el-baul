import React, { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Baul, Chapter, PhotoDate } from '@/types';
import { ChapterSelector, ChapterSelection } from '@/features/chapters/components/ChapterSelector';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { SelectedPhoto } from '@/features/photos/uploadFlow';

interface UploadConfirmationScreenProps {
  baul: Baul;
  currentChapter: Chapter;
  existingChapters: Chapter[];
  /** Set only when entered from an already-open chapter — the chapter step is skipped
   * entirely and photos go straight into it, since the destination is already obvious. */
  currentChapterId?: string;
  selectedPhotos: SelectedPhoto[];
  onBack: () => void;
  onUpload: (photos: SelectedPhoto[], chapter: ChapterSelection, date: PhotoDate | null) => void;
}

export function UploadConfirmationScreen({
  currentChapter,
  existingChapters,
  currentChapterId,
  selectedPhotos,
  onBack,
  onUpload
}: UploadConfirmationScreenProps) {
  const [photos, setPhotos] = useState(selectedPhotos);
  const [chapter, setChapter] = useState<ChapterSelection | null>(
    currentChapterId ? { type: 'existing', chapterId: currentChapterId } : null
  );

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  // Cada foto se sube con su propia fecha EXIF (extraída en el servidor); no se pide
  // fecha aquí para no añadir un paso manual — las que no tengan EXIF quedan sin fecha.
  const canConfirm = chapter !== null && (chapter.type !== 'new' || chapter.name.trim().length > 0);

  const handleConfirm = () => {
    if (!canConfirm || !chapter) return;
    onUpload(photos, chapter, null);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="stacked"
        onBack={onBack}
        title="Añadir fotos al capítulo"
        subtitle={currentChapter.name}
      />

      {/* Content */}
      <PageContainer className="py-6">
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
              <Button variant="plain"
                onClick={() => handleRemovePhoto(photo.id)}
                aria-label="Quitar foto"
                className="absolute -top-2 -right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icon icon={icons.close} size="sm" aria-hidden />
              </Button>
            </div>
          ))}
        </div>

        {/* Capítulo — skipped when uploading straight into an already-open chapter */}
        {!currentChapterId && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-foreground mb-3">Capítulo</h2>
            <ChapterSelector
              chapters={existingChapters}
              currentChapterId={currentChapterId}
              value={chapter}
              onChange={setChapter}
            />
          </div>
        )}

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
      </PageContainer>
    </div>
  );
}
