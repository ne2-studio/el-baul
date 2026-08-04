import React, { useRef, useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Chapter } from '@/types';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { SelectedPhoto, materializeFileList } from '@/features/photos/uploadFlow';
import { useFileInputSelection } from '@/hooks/useFileInputSelection';

interface UploadConfirmationScreenProps {
  currentChapter: Chapter;
  selectedPhotos: SelectedPhoto[];
  onBack: () => void;
  /** Se llama cuando alguna foto elegida no se pudo leer (p. ej. el permiso content:// de
   * Android caducó) y por tanto se ha excluido en silencio de la selección. */
  onPhotosDropped?: (count: number) => void;
  onUpload: (photos: SelectedPhoto[]) => void;
}

export function UploadConfirmationScreen({
  currentChapter,
  selectedPhotos,
  onBack,
  onPhotosDropped,
  onUpload,
}: UploadConfirmationScreenProps) {
  const [photos, setPhotos] = useState(selectedPhotos);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => fileInputRef.current?.click();
  const addPhotos = (newPhotos: SelectedPhoto[]) => setPhotos((prev) => [...prev, ...newPhotos]);
  const handleFileSelect = useFileInputSelection(addPhotos, onPhotosDropped);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    const { selectedPhotos: dropped, droppedCount } = await materializeFileList(files);
    if (droppedCount > 0) onPhotosDropped?.(droppedCount);
    if (dropped.length > 0) addPhotos(dropped);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  // Cada foto se sube con su propia fecha EXIF (extraída en el servidor); no se pide
  // fecha aquí para no añadir un paso manual — las que no tengan EXIF quedan sin fecha.
  const handleConfirm = () => {
    if (photos.length === 0) return;
    onUpload(photos);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="stacked"
        onBack={onBack}
        title="Subir fotos"
        subtitle={currentChapter.name}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <PageContainer className="py-6">
        {photos.length === 0 ? (
          <div
            role="button"
            tabIndex={0}
            onClick={openPicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-border transition-colors hover:border-primary/40"
          >
            <EmptyState
              icon={<Icon icon={icons.upload} className="w-20 h-20" aria-hidden />}
              title="Sube tus fotos"
              subtitle={
                <>
                  <span className="md:hidden">Toca para seleccionar fotos de la galería</span>
                  <span className="hidden md:inline">
                    Arrastra fotos aquí para subir o haz clic para seleccionarlas
                  </span>
                </>
              }
            />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-center text-muted-foreground">
                {photos.length} {photos.length === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square group">
                  <img
                    src={photo.preview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button variant="plain"
                    onClick={() => handleRemovePhoto(photo.id)}
                    aria-label="Quitar foto"
                    className="absolute -top-2 -right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon icon={icons.close} size="sm" aria-hidden />
                  </Button>
                </div>
              ))}

              <button
                type="button"
                onClick={openPicker}
                aria-label="Añadir más fotos"
                className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Icon icon={icons.add} size="lg" aria-hidden />
              </button>
            </div>

            <div className="space-y-3">
              <Button variant="primary" fullWidth onClick={handleConfirm}>
                Guardar recuerdos
              </Button>
              <Button variant="ghost" fullWidth onClick={onBack}>
                Cancelar
              </Button>
            </div>
          </>
        )}
      </PageContainer>
    </div>
  );
}
