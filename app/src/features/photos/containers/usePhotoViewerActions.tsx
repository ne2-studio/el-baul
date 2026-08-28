import React, { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { Download, Calendar, CalendarOff, Flag, Trash2, Tag, Share2 } from 'lucide-react';
import { DateModal } from '@/design-system/patterns/forms/DateModal';
import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';
import { DeletePhotoModal } from '@/features/photos/components/DeletePhotoModal';
import { RemovalRequestModal } from '@/features/moderation/components/RemovalRequestModal';
import { TagPersonasModal } from '@/features/photos/components/TagPersonasModal';
import { PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { Persona, Photo, PhotoDate, Recuerdo, TaggedPersona } from '@/types';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useUIStore } from '@/store/uiStore';
import { submitRemovalRequest } from '@/features/moderation/useCases';
import { setTaggedPersonas, deletePhoto, changePhotoDate, clearPhotoDate } from '@/features/photos/useCases';
import { addRecuerdo as addRecuerdoUseCase, editRecuerdo as editRecuerdoUseCase } from '@/features/memories/useCases';
import { api } from '@/api';
import { saveDownloadedPhoto } from '@/utils/downloadFile';
import { Capacitor } from '@capacitor/core';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';
import { usePostHog } from 'posthog-js/react';

interface UsePhotoViewerActionsOptions {
  baulId: string;
  baulName: string;
  photo: Photo;
  sharedLinksEnabled: boolean;
  baulPersonas?: Persona[];
  taggedPersonas?: TaggedPersona[];
  /** Se invoca tras retirar la foto con éxito, para cerrar el visor (la foto ya no existe).
   * En la práctica es el mismo callback que cierra el visor por cualquier otro motivo — ver
   * PhotoViewerContainer, que le pasa directamente su propio onClose. */
  onDeleted: () => void;
}

interface UsePhotoViewerActionsResult {
  /** Construye el array final de items del menú "···". `extraItems` son las acciones que
   * solo tienen sentido para quien nos monta (p.ej. mover de capítulo — exclusiva de
   * ChapterPhotoViewerContainer, que no conoce esta hook en absoluto). Se intercalan antes de
   * las acciones destructivas, que van siempre al final sin importar qué se les pase — así
   * ningún caller puede romper ese orden por accidente. */
  buildMenuItems: (extraItems?: PhotoViewerMenuItem[]) => PhotoViewerMenuItem[];
  canChangeDate: boolean;
  openDateModal: () => void;
  modals: React.ReactNode;
  onAddRecuerdo: (text: string) => void;
  onEditRecuerdo: (recuerdo: Recuerdo, text: string) => Promise<boolean>;
  onShareRecuerdo: (recuerdo: Recuerdo) => void;
}

// Acciones "···" del visor de fotos, más añadir/editar/compartir recuerdo (antes duplicadas
// en cada XxxPhotoViewerRoute) — todo en un único sitio, sin saber nada de capítulos: mover
// vive en ChapterPhotoViewerContainer, un nivel por encima, y se intercala vía buildMenuItems.
// Ni PhotoViewer (puro) ni PhotoViewerContainer (universal) importan store/useCases/router
// para nada de esto.
export function usePhotoViewerActions({
  baulId, baulName, photo, sharedLinksEnabled, baulPersonas = [], taggedPersonas = [], onDeleted,
}: UsePhotoViewerActionsOptions): UsePhotoViewerActionsResult {
  const auth = useAuth();
  const { run } = useAsyncAction();
  const posthog = usePostHog();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const hasRequestedRemoval = useUIStore((state) => state.hasRequestedPhotoRemoval(photo.id));
  const markPhotoRemovalRequested = useUIStore((state) => state.markPhotoRemovalRequested);

  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showClearDateModal, setShowClearDateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [isSubmittingRemoval, setIsSubmittingRemoval] = useState(false);
  const [isSubmittingDate, setIsSubmittingDate] = useState(false);
  const [isClearingDate, setIsClearingDate] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [isSubmittingTags, setIsSubmittingTags] = useState(false);

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
    if (result.ok) {
      posthog.capture('person_tagged', { photo_count: 1 });
      setShowTagModal(false);
    }
  };

  const handleSharePhoto = async () => {
    const result = await run(() => api.photos.createShareLink(photo.id), {
      key: 'share-photo',
      errorMessage: 'Error al crear el enlace',
    });
    if (!result.ok) return;
    posthog.capture('photo_shared');
    await sharePublicLink({
      title: `Foto de ${baulName}`,
      text: `Te comparto una foto de "${baulName}" en El Baúl.`,
      url: result.value.url,
      onCopied: () => showToastMessage('Enlace copiado al portapapeles'),
    });
  };

  const handleDownloadPhoto = async () => {
    const result = await run(async () => {
      const { blob, fileName } = await api.photos.download(photo.id);
      await saveDownloadedPhoto(blob, fileName);
    }, {
      successMessage: Capacitor.isNativePlatform() ? 'Foto guardada en la galería' : undefined,
      errorMessage: 'Error al descargar la foto',
    });
    if (result.ok) posthog.capture('photo_downloaded');
  };

  const handleDateSubmit = async (date: PhotoDate) => {
    setIsSubmittingDate(true);
    const result = await run(() => changePhotoDate(baulId, photo.id, date), {
      successMessage: 'Fecha actualizada',
      errorMessage: 'Error al cambiar la fecha',
    });
    setIsSubmittingDate(false);
    if (result.ok) {
      posthog.capture('photo_date_changed', { action: 'set' });
      setShowDateModal(false);
    }
  };

  const handleClearDateConfirm = async () => {
    setIsClearingDate(true);
    const result = await run(() => clearPhotoDate(baulId, photo.id), {
      successMessage: 'Fecha borrada',
      errorMessage: 'Error al borrar la fecha',
    });
    setIsClearingDate(false);
    if (result.ok) {
      posthog.capture('photo_date_changed', { action: 'clear' });
      setShowClearDateModal(false);
    }
  };

  const handleDeleteSubmit = async (reason: string) => {
    setIsDeletingPhoto(true);
    const result = await run(() => deletePhoto(baulId, photo.id, reason), {
      successMessage: 'La foto ha sido borrada',
      errorMessage: 'Error al borrar la foto',
    });
    setIsDeletingPhoto(false);
    if (result.ok) {
      posthog.capture('photo_deleted');
      setShowDeleteModal(false);
      onDeleted();
    }
  };

  const handleSubmitRemoval = async (reason: string) => {
    setIsSubmittingRemoval(true);
    const result = await run(() => submitRemovalRequest(baulId, photo, reason), {
      successMessage: 'Tu solicitud ha sido enviada',
      errorMessage: 'Error al enviar la solicitud',
    });
    setIsSubmittingRemoval(false);
    if (result.ok) {
      posthog.capture('photo_removal_requested');
      setShowRemovalModal(false);
      markPhotoRemovalRequested(photo.id);
    }
  };

  const handleAddRecuerdo = (text: string) => {
    if (!auth.isAuthenticated) return;
    run(() => addRecuerdoUseCase(baulId, photo.id, text), { errorMessage: 'Error al añadir el recuerdo' })
      .then((result) => {
        if (result.ok) posthog.capture('recuerdo_created', { source: 'photo_viewer' });
      });
  };

  const handleEditRecuerdo = async (recuerdo: Recuerdo, text: string): Promise<boolean> => {
    if (!auth.isAuthenticated) return false;
    const result = await run(() => editRecuerdoUseCase(recuerdo.id, text), {
      successMessage: 'Recuerdo actualizado',
      errorMessage: 'Error al guardar el recuerdo',
    });
    if (result.ok) posthog.capture('recuerdo_edited');
    return result.ok;
  };

  const handleShareRecuerdo = async (recuerdo: Recuerdo) => {
    const result = await run(() => api.recuerdos.createShareLink(recuerdo.id), {
      key: 'share-recuerdo',
      errorMessage: 'Error al crear el enlace',
    });
    if (!result.ok) return;
    posthog.capture('recuerdo_shared');
    await sharePublicLink({
      title: `Recuerdo de ${baulName}`,
      text: `Te comparto un recuerdo de "${baulName}" en El Baúl.`,
      url: result.value.url,
      onCopied: () => showToastMessage('Enlace copiado al portapapeles'),
    });
  };

  const buildMenuItems = (extraItems: PhotoViewerMenuItem[] = []): PhotoViewerMenuItem[] => {
    const items: PhotoViewerMenuItem[] = [
      { key: 'tag-personas', label: 'Etiquetar personas', icon: Tag, onSelect: openTagModal },
    ];
    if (sharedLinksEnabled) {
      items.push({ key: 'share', label: 'Compartir foto', icon: Share2, onSelect: handleSharePhoto });
    }
    items.push({ key: 'download', label: 'Descargar foto original', icon: Download, onSelect: handleDownloadPhoto });
    items.push(...extraItems);
    items.push({ key: 'date', label: 'Cambiar fecha', icon: Calendar, onSelect: () => setShowDateModal(true) });
    if (photo.date) {
      // Variant por defecto (no destructiva) a propósito: aunque borra la fecha, no debe
      // competir en protagonismo visual con "Borrar foto", la única acción realmente
      // destructiva de este menú.
      items.push({ key: 'clear-date', label: 'Borrar fecha', icon: CalendarOff, onSelect: () => setShowClearDateModal(true) });
    }
    // Destructivas siempre al final, sin importar qué extras se hayan intercalado arriba.
    // canDelete/canRequestRemoval vienen calculadas por el backend (nunca ambas a true) — ver
    // PhotoDto/PhotoDeletePolicy. El frontend solo pinta lo que el backend ya decidió, sin
    // reconstruir aquí la regla de admin/propietario/ventana de gracia.
    if (photo.canRequestRemoval) {
      items.push(hasRequestedRemoval
        ? { key: 'removal', label: 'Ya has solicitado la retirada', icon: Flag, onSelect: () => {}, disabled: true }
        : { key: 'removal', label: 'Solicitar retirada', icon: Flag, onSelect: () => setShowRemovalModal(true) });
    }
    if (photo.canDelete) {
      items.push({ key: 'delete', label: 'Borrar foto', icon: Trash2, onSelect: () => setShowDeleteModal(true), variant: 'destructive' });
    }
    return items;
  };

  const modals = (
    <>
      {showRemovalModal && (
        <RemovalRequestModal
          onCancel={() => setShowRemovalModal(false)}
          onConfirm={handleSubmitRemoval}
          isSubmitting={isSubmittingRemoval}
        />
      )}

      {showDateModal && (
        <DateModal
          title="Cambiar fecha de la foto"
          onCancel={() => setShowDateModal(false)}
          onConfirm={handleDateSubmit}
          isSubmitting={isSubmittingDate}
          initialValue={photo.date}
        />
      )}

      {showClearDateModal && (
        <ConfirmActionModal
          title="Borrar fecha de la foto"
          tone="plain"
          description="La foto dejará de tener una fecha asignada. Podrás añadir una nueva más adelante."
          confirmLabel="Sí, borrar fecha"
          confirmVariant="primary"
          onCancel={() => setShowClearDateModal(false)}
          onConfirm={handleClearDateConfirm}
          isSubmitting={isClearingDate}
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
    buildMenuItems,
    // Cambiar fecha ya no depende de estar dentro de un capítulo — universal en cualquier
    // visor. Se mantiene como campo explícito (en vez de asumir siempre true en PhotoViewer)
    // por si algún visor futuro necesita desactivarlo.
    canChangeDate: true,
    openDateModal: () => setShowDateModal(true),
    modals,
    onAddRecuerdo: handleAddRecuerdo,
    onEditRecuerdo: handleEditRecuerdo,
    onShareRecuerdo: handleShareRecuerdo,
  };
}
