import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, ImageIcon, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { IconButton } from '@/design-system/components/actions/IconButton';
import { EditInfoModal } from '@/design-system/patterns/forms/EditInfoModal';
import { DeleteChapterModal } from '@/features/chapters/components/DeleteChapterModal';
import { CoverPhotoPickerModal } from '@/features/photos/components/CoverPhotoPickerModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';
import { Photo } from '@/types';
import { getBaulPermissions } from '@/utils/roleUtils';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { renameChapter, deleteChapter, setChapterCover } from '@/features/chapters/useCases';
import { PhotoCrop, api } from '@/api';

interface ChapterSettingsMenuContainerProps {
  baulId: string;
  /** null = fotos sueltas virtual chapter — mirrors ChapterRoute's own discriminator. The
   * virtual chapter has no settings at all, so the container renders nothing for it. */
  chapterId: string | null;
  chapterName: string;
  photoCount: number;
  recuerdoCount: number;
  // "Seleccionar fotos" enters ChapterRoute's own multi-select mode — that state stays owned
  // by ChapterRoute (it drives PhotoSwimlanes highlighting), so this is the one callback the
  // container needs from outside instead of self-containing everything.
  onEnterSelectionMode: () => void;
}

// Self-sufficient "···" menu: owns the cover/rename/delete actions and their modals end to
// end, so ChapterRoute (its only caller) doesn't need to know chapter settings exist beyond
// mounting this in its header's trailing slot. Self-navigates back to the baúl after a
// successful delete — only needs baulId, nothing route-context-dependent — see
// docs/architecture/frontend.md's containers/ rule.
export function ChapterSettingsMenuContainer({
  baulId, chapterId, chapterName, photoCount, recuerdoCount, onEnterSelectionMode,
}: ChapterSettingsMenuContainerProps) {
  const navigate = useNavigate();
  const { baules } = useBaulesStore();
  const { run, isPending } = useAsyncAction();
  const baulPermissions = getBaulPermissions(baules.find((b) => b.id === baulId));

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (chapterId === null) return null;

  const handleSaveChapterInfo = async (name: string) => {
    const result = await run(() => renameChapter(baulId, chapterId, name), {
      successMessage: 'Información del capítulo actualizada',
      errorMessage: 'Error al actualizar la información del capítulo',
    });
    if (result.ok) setShowEditModal(false);
  };

  const handleSetChapterCover = (photo: Photo, crop: PhotoCrop) => {
    run(() => setChapterCover(baulId, chapterId, photo.id, crop, photo.thumbnailUrl), {
      successMessage: 'Portada del capítulo actualizada',
      errorMessage: 'Error al establecer la portada',
    });
  };

  const handleDeleteChapter = async () => {
    const result = await run(() => deleteChapter(baulId, chapterId), {
      successMessage: 'Capítulo eliminado',
      errorMessage: 'Error al eliminar el capítulo',
    });
    if (result.ok) {
      navigate(`/baules/${baulId}`);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton aria-label="Opciones del capítulo">
            <MoreVertical className="w-5 h-5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onEnterSelectionMode}>
            <CheckSquare className="w-4 h-4 mr-2" />
            Seleccionar fotos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowCoverPicker(true)}>
            <ImageIcon className="w-4 h-4 mr-2" />
            Elegir foto de portada
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowEditModal(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Editar información del capítulo
          </DropdownMenuItem>
          {baulPermissions.canDeleteChapter && (
            <DropdownMenuItem variant="destructive" onClick={() => setShowDeleteModal(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar capítulo
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showEditModal && (
        <EditInfoModal
          title="Editar información del capítulo"
          initialName={chapterName}
          namePlaceholder="Nombre del capítulo"
          onCancel={() => setShowEditModal(false)}
          onSave={handleSaveChapterInfo}
          isSubmitting={isPending()}
        />
      )}

      {showDeleteModal && (
        <DeleteChapterModal
          photoCount={photoCount}
          recuerdoCount={recuerdoCount}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteChapter}
          isSubmitting={isPending()}
        />
      )}

      {showCoverPicker && (
        <CoverPhotoPickerModal
          title="Elegir portada del capítulo"
          fetchPage={(skip, take) => api.photos.getPage(baulId, { chapterId, skip, take })}
          onSelect={handleSetChapterCover}
          onCancel={() => setShowCoverPicker(false)}
        />
      )}
    </>
  );
}
