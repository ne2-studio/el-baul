import React, { useState } from 'react';
import { Download, BookImage, FolderInput, Calendar, Flag, Trash2, Tag, Share2 } from 'lucide-react';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { MoveModal } from '@/features/photos/components/MoveModal';
import { DateModal } from '@/design-system/patterns/forms/DateModal';
import { DeletePhotoModal } from '@/features/photos/components/DeletePhotoModal';
import { RemovalRequestModal } from '@/features/photos/components/RemovalRequestModal';
import { TagPersonasModal } from '@/features/photos/components/TagPersonasModal';
import { PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { Chapter, Persona, Photo, PhotoDate, TaggedPersona } from '@/types';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useUIStore } from '@/store/uiStore';
import { submitRemovalRequest, setTaggedPersonas, movePhotos, deletePhoto, changePhotoDate } from '@/features/photos/useCases';
import { setBaulCover } from '@/features/baules/useCases';
import { setChapterCover } from '@/features/chapters/useCases';
import { api } from '@/api';
import { saveDownloadedPhoto } from '@/utils/downloadFile';
import { Capacitor } from '@capacitor/core';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';

export interface PhotoViewerChapterScope {
  /** null = the photo currently belongs to no chapter (fotos sueltas) — still a valid scope
   * for move/date/removal/delete, just not for "set as chapter cover". */
  apiChapterId: string | null;
  allChapters: Chapter[];
  currentChapter?: Chapter;
  /** Route-context-dependent (navigates into the target chapter's own basePath/URL scheme),
   * stays owned by the Route — see docs/architecture/frontend.md's containers/ rule. */
  onMoved: (targetChapterId: string) => void;
  /** Route-context-dependent (needs the viewer's backgroundLocation to close correctly). */
  onDeleted: () => void;
}

interface UsePhotoSettingsMenuOptions {
  baulId: string;
  baulName: string;
  photo: Photo;
  isAdmin?: boolean;
  sharedLinksEnabled: boolean;
  baulPersonas?: Persona[];
  taggedPersonas?: TaggedPersona[];
  /** Absent for viewers with no baúl/chapter scope at all (e.g. PersonaPhotoViewerRoute browses
   * a persona's tagged photos across chapters) — move/date/covers/removal-request/delete all
   * need "which chapter", so they're unavailable without it; tag/share/download aren't. */
  chapter?: PhotoViewerChapterScope;
}

interface UsePhotoSettingsMenuResult {
  menuItems: PhotoViewerMenuItem[];
  /** Whether the "date" action exists at all — drives the inline "tap the date to edit"
   * affordance in the viewer body, which shares this same modal/state with the menu item. */
  canChangeDate: boolean;
  openDateModal: () => void;
  modals: React.ReactNode;
}

// Self-sufficient "···" menu for the photo viewer: owns tag/share/download/covers/move/
// date/removal-request/delete end to end, so PhotoViewer (its only caller, a components/
// file) doesn't import store/useCases/router itself — it just calls this hook, the same
// exception the containers/ layer already gets when rendered as a component instead of
// invoked as a hook — see docs/architecture/frontend.md's containers/ rule.
export function usePhotoSettingsMenu({
  baulId, baulName, photo, isAdmin, sharedLinksEnabled, baulPersonas = [], taggedPersonas = [], chapter,
}: UsePhotoSettingsMenuOptions): UsePhotoSettingsMenuResult {
  const { run } = useAsyncAction();
  const showToastMessage = useUIStore((state) => state.showToastMessage);

  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [isSubmittingRemoval, setIsSubmittingRemoval] = useState(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [isSubmittingDate, setIsSubmittingDate] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [isSubmittingTags, setIsSubmittingTags] = useState(false);

  const moveableChapters = chapter ? chapter.allChapters.filter((a) => a.id !== chapter.currentChapter?.id) : [];

  const openTagModal = () => {
    setSelectedPersonaIds(taggedPersonas.map((p) => p.id));
    setShowTagModal(true);
  };

  const toggleTaggedPersona = (personaId: string) => {
    setSelectedPersonaIds((current) =>
      current.includes(personaId) ? current.filter((id) => id !== personaId) : [...current, personaId]);
  };

  const handleTagsSubmit = async () => {
    setIsSubmittingTags(true);
    const result = await run(() => setTaggedPersonas(photo.id, selectedPersonaIds), {
      successMessage: 'Personas etiquetadas actualizadas',
      errorMessage: 'Error al etiquetar personas',
    });
    setIsSubmittingTags(false);
    if (result.ok) setShowTagModal(false);
  };

  const handleSharePhoto = async () => {
    const result = await run(() => api.photos.createShareLink(photo.id), {
      key: 'share-photo',
      errorMessage: 'Error al crear el enlace',
    });
    if (!result.ok) return;
    await sharePublicLink({
      title: `Foto de ${baulName}`,
      text: `Te comparto una foto de "${baulName}" en El Baúl.`,
      url: result.value.url,
      onCopied: () => showToastMessage('Enlace copiado al portapapeles'),
    });
  };

  const handleDownloadPhoto = async () => {
    await run(async () => {
      const { blob, fileName } = await api.photos.download(photo.id);
      await saveDownloadedPhoto(blob, fileName);
    }, {
      successMessage: Capacitor.isNativePlatform() ? 'Foto guardada en la galería' : undefined,
      errorMessage: 'Error al descargar la foto',
    });
  };

  const handleSetChapterCover = () => {
    if (!chapter?.apiChapterId) return;
    run(() => setChapterCover(baulId, chapter.apiChapterId!, photo.id, photo.thumbnailUrl), {
      successMessage: 'Portada del capítulo actualizada',
      errorMessage: 'Error al establecer la portada',
    });
  };

  const handleSetBaulCover = () => {
    run(() => setBaulCover(baulId, photo.id, photo.thumbnailUrl), {
      successMessage: 'Portada del baúl actualizada',
      errorMessage: 'Error al establecer la portada',
    });
  };

  const handleMoveSubmit = async () => {
    if (!moveTargetId || !chapter) return;
    const targetChapterId = moveTargetId;
    setIsSubmittingMove(true);
    const result = await run(() => movePhotos(baulId, chapter.apiChapterId, [photo.id], targetChapterId), {
      successMessage: 'Foto movida',
      errorMessage: 'Error al mover la foto',
    });
    setIsSubmittingMove(false);
    if (result.ok) {
      setShowMoveModal(false);
      setMoveTargetId('');
      chapter.onMoved(targetChapterId);
    }
  };

  const handleDateSubmit = async (date: PhotoDate) => {
    if (!chapter) return;
    setIsSubmittingDate(true);
    const result = await run(() => changePhotoDate(baulId, chapter.apiChapterId, photo.id, date), {
      successMessage: 'Fecha actualizada',
      errorMessage: 'Error al cambiar la fecha',
    });
    setIsSubmittingDate(false);
    if (result.ok) setShowDateModal(false);
  };

  const handleDeleteSubmit = async (reason: string) => {
    if (!chapter) return;
    setIsDeletingPhoto(true);
    const result = await run(() => deletePhoto(baulId, chapter.apiChapterId, photo.id, reason), {
      successMessage: 'La foto ha sido retirada',
      errorMessage: 'Error al retirar la foto',
    });
    setIsDeletingPhoto(false);
    if (result.ok) {
      setShowDeleteModal(false);
      chapter.onDeleted();
    }
  };

  const handleSubmitRemoval = async (reason: string) => {
    setIsSubmittingRemoval(true);
    const result = await run(() => submitRemovalRequest(baulId, photo, reason), {
      successMessage: 'Tu solicitud ha sido enviada',
      errorMessage: 'Error al enviar la solicitud',
    });
    setIsSubmittingRemoval(false);
    if (result.ok) setShowRemovalModal(false);
  };

  const menuItems: PhotoViewerMenuItem[] = [
    { key: 'tag-personas', label: 'Etiquetar personas', icon: Tag, onSelect: openTagModal },
  ];
  if (sharedLinksEnabled) {
    menuItems.push({ key: 'share', label: 'Compartir foto', icon: Share2, onSelect: handleSharePhoto });
  }
  menuItems.push({ key: 'download', label: 'Descargar foto original', icon: Download, onSelect: handleDownloadPhoto });
  if (chapter) {
    if (chapter.apiChapterId !== null) {
      menuItems.push({ key: 'chapter-cover', label: 'Establecer como portada del capítulo', icon: BookImage, onSelect: handleSetChapterCover });
    }
    if (isAdmin) {
      menuItems.push({ key: 'baul-cover', label: 'Establecer como portada del baúl', icon: BaulIcon, onSelect: handleSetBaulCover });
    }
    if (moveableChapters.length > 0) {
      menuItems.push({ key: 'move', label: 'Mover a otro capítulo', icon: FolderInput, onSelect: () => setShowMoveModal(true) });
    }
    menuItems.push({ key: 'date', label: 'Cambiar fecha', icon: Calendar, onSelect: () => setShowDateModal(true) });
    if (!isAdmin) {
      menuItems.push({ key: 'removal', label: 'Solicitar retirada', icon: Flag, onSelect: () => setShowRemovalModal(true) });
    }
    if (isAdmin) {
      menuItems.push({ key: 'delete', label: 'Retirar foto', icon: Trash2, onSelect: () => setShowDeleteModal(true), variant: 'destructive' });
    }
  }

  const modals = (
    <>
      {showRemovalModal && (
        <RemovalRequestModal
          onCancel={() => setShowRemovalModal(false)}
          onConfirm={handleSubmitRemoval}
          isSubmitting={isSubmittingRemoval}
        />
      )}

      {showMoveModal && chapter && (
        <MoveModal
          title="Mover a otro capítulo"
          chapters={moveableChapters}
          selectedId={moveTargetId}
          onSelect={setMoveTargetId}
          onCancel={() => setShowMoveModal(false)}
          onConfirm={handleMoveSubmit}
          isSubmitting={isSubmittingMove}
        />
      )}

      {showDateModal && (
        <DateModal
          title="Cambiar fecha de la foto"
          onCancel={() => setShowDateModal(false)}
          onConfirm={handleDateSubmit}
          isSubmitting={isSubmittingDate}
        />
      )}

      {showDeleteModal && (
        <DeletePhotoModal
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteSubmit}
          isSubmitting={isDeletingPhoto}
        />
      )}

      {showTagModal && (
        <TagPersonasModal
          personas={baulPersonas}
          selectedIds={selectedPersonaIds}
          onToggle={toggleTaggedPersona}
          onCancel={() => setShowTagModal(false)}
          onConfirm={handleTagsSubmit}
          isSubmitting={isSubmittingTags}
        />
      )}
    </>
  );

  return {
    menuItems,
    canChangeDate: !!chapter,
    openDateModal: () => setShowDateModal(true),
    modals,
  };
}
