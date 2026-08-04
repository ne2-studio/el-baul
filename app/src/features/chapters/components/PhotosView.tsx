import React, { useRef, useState } from 'react';
import { useElementHeight } from '@/hooks/useElementHeight';
import { useFileInputSelection } from '@/hooks/useFileInputSelection';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { EditInfoModal } from '@/design-system/patterns/forms/EditInfoModal';
import { Hero } from '@/design-system/layouts/Hero';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { Plus, ImageIcon, MessageCircle, CheckSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { SelectedPhoto } from '@/features/photos/uploadFlow';
import { DeleteChapterModal } from '@/features/chapters/components/DeleteChapterModal';
import { CoverPhotoPickerModal } from '@/features/photos/components/CoverPhotoPickerModal';
import { RecuerdosFeed } from '@/features/memories/components/RecuerdosFeed';
import { BatchPhotoActionsBar } from '@/features/photos/components/BatchPhotoActionsBar';
import { Chapter, Photo, PhotoDate, Persona, Recuerdo } from '@/types';
import { formatDateRange } from '@/app/utils/timeUtils';
import { IconButton } from '@/design-system/components/actions/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';

interface PhotosViewProps {
  chapter: Chapter;
  photos: Photo[];
  onBack: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onAddPhotos: (selectedPhotos: SelectedPhoto[]) => void;
  /** Se llama cuando alguna foto elegida no se pudo leer (p. ej. el permiso content:// de
   * Android caducó) y por tanto se ha excluido en silencio de la selección. */
  onPhotosDropped?: (count: number) => void;
  allChapters?: Chapter[];
  onBatchMove?: (
    photoIds: string[],
    targetChapterId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => Promise<void>;
  onBatchChangeDate?: (photoIds: string[], date: PhotoDate) => Promise<boolean>;
  onBatchCreateChapter?: (photoIds: string[], name: string) => Promise<boolean>;
  personas?: Persona[];
  onBatchTagPersonas?: (photoIds: string[], personaIds: string[]) => Promise<boolean>;
  onUpdateChapterInfo?: (name: string) => Promise<boolean>;
  onDeleteChapter?: () => Promise<boolean>;
  onFetchChapterCoverPhotos?: (skip: number, take: number) => Promise<{ photos: Photo[]; hasMore: boolean }>;
  onSetChapterCover?: (photo: Photo) => void;
  recuerdos?: Recuerdo[];
  onAddRecuerdo?: (text: string) => void;
  onUserClick?: (personaId: string) => void;
  onShareRecuerdo?: (recuerdo: Recuerdo) => void;
  onEditRecuerdo?: (recuerdo: Recuerdo, text: string) => Promise<boolean> | boolean | void;
}

export function PhotosView({
  chapter, photos, onBack, onSelectPhoto, onAddPhotos, onPhotosDropped, allChapters = [], onBatchMove, onBatchChangeDate,
  onBatchCreateChapter, personas = [], onBatchTagPersonas, onUpdateChapterInfo, onDeleteChapter, onFetchChapterCoverPhotos,
  onSetChapterCover, recuerdos = [], onAddRecuerdo, onUserClick, onShareRecuerdo, onEditRecuerdo,
}: PhotosViewProps) {
  const hasRecuerdosTab = !!onAddRecuerdo;
  const totalRecuerdos = hasRecuerdosTab ? recuerdos.length : photos.reduce((sum, photo) => sum + (photo.recuerdoCount || 0), 0);
  const [activeTab, setActiveTab] = useState<'fotos' | 'recuerdos'>('fotos');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [isSavingChapterInfo, setIsSavingChapterInfo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingChapter, setIsDeletingChapter] = useState(false);

  const handleSaveChapterInfo = async (name: string) => {
    setIsSavingChapterInfo(true);
    const ok = (await onUpdateChapterInfo?.(name)) ?? false;
    setIsSavingChapterInfo(false);
    if (ok) setShowEditModal(false);
  };

  const handleDeleteChapter = async () => {
    setIsDeletingChapter(true);
    const ok = (await onDeleteChapter?.()) ?? false;
    setIsDeletingChapter(false);
    if (ok) setShowDeleteModal(false);
  };

  // Multi-selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setSelectionMode(next.size > 0);
      return next;
    });
  };

  const handleLongPress = (photoId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([photoId]));
  };

  // Toggles an entire month-group at once (swimlane click): selects it fully unless
  // every photo in it is already selected, in which case it deselects the group.
  const handleToggleGroup = (groupPhotos: Photo[]) => {
    const groupIds = groupPhotos.map(p => p.id);
    const allSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      groupIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      setSelectionMode(next.size > 0);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const moveableChapters = allChapters.filter(a => a.id !== chapter.id);

  const handleFileSelect = useFileInputSelection(onAddPhotos, onPhotosDropped);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
        variant="row"
        onBack={selectionMode ? exitSelection : onBack}
        backLabel={selectionMode ? 'Cancelar' : 'Volver'}
        trailing={
          selectionMode ? (
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? 'seleccionada' : 'seleccionadas'}
            </span>
          ) : onUpdateChapterInfo && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  aria-label="Opciones del capítulo"
                >
                  <MoreVertical className="w-5 h-5" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setSelectionMode(true)}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Seleccionar fotos
                </DropdownMenuItem>
                {onFetchChapterCoverPhotos && onSetChapterCover && (
                  <DropdownMenuItem onClick={() => setShowCoverPicker(true)}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Elegir foto de portada
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar información del capítulo
                </DropdownMenuItem>
                {onDeleteChapter && (
                  <DropdownMenuItem variant="destructive" onClick={() => setShowDeleteModal(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar capítulo
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />

      {/* Hero — shown when not in selection mode */}
      {!selectionMode && (
        <Hero imageUrl={chapter.featuredCoverPhotoUrl ?? chapter.coverPhotoUrl} title={chapter.name}>
          {chapter.minDate && chapter.maxDate && (
            <p className="text-xs text-white/65 mt-1 font-medium tracking-wide">
              {formatDateRange(chapter.minDate, chapter.maxDate)}
            </p>
          )}
        </Hero>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Tabbar solo cuando el llamante soporta un feed de Recuerdos (capítulos reales, no
          el de fotos sueltas virtual) — sin él no hay nada entre lo que hacer swipe. */}
      {hasRecuerdosTab ? (
        <Tabbar
          tabs={[
            { key: 'fotos', label: 'Fotos', count: photos.length },
            { key: 'recuerdos', label: 'Recuerdos', count: recuerdos.length },
          ]}
          active={activeTab}
          onChange={(key) => setActiveTab(key as 'fotos' | 'recuerdos')}
          top={headerHeight}
          hideStrip={selectionMode}
        >
          <PageContainer className="py-6 pb-28">
            {activeTab === 'fotos' && (
              photos.length === 0 ? (
                <EmptyState
                  icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />}
                  title="Todavía no hay fotos aquí"
                  subtitle="Añade fotos para empezar este recuerdo"
                />
              ) : (
                <PhotoSwimlanes
                  photos={photos}
                  onSelectPhoto={onSelectPhoto}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onLongPress={handleLongPress}
                  onToggleGroup={handleToggleGroup}
                />
              )
            )}

            <RecuerdosFeed
              active={activeTab === 'recuerdos'}
              photos={photos}
              recuerdos={recuerdos}
              onSelectPhoto={onSelectPhoto}
              onAddRecuerdo={onAddRecuerdo}
              onUserClick={onUserClick}
              onShareRecuerdo={onShareRecuerdo}
              onEditRecuerdo={onEditRecuerdo}
              selectionMode={selectionMode}
            />
          </PageContainer>
        </Tabbar>
      ) : (
        <PageContainer className="py-6 pb-28">
          {!selectionMode && totalRecuerdos > 0 && (
            <div className="flex items-center gap-1.5 mb-5 -mt-1">
              <MessageCircle className="w-3.5 h-3.5 text-muted-foreground/60" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground/75">
                {totalRecuerdos} {totalRecuerdos === 1 ? 'recuerdo' : 'recuerdos'} en este capítulo
              </span>
            </div>
          )}

          {photos.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />}
              title="Todavía no hay fotos aquí"
              subtitle="Añade fotos para empezar este recuerdo"
            />
          ) : (
            <PhotoSwimlanes
              photos={photos}
              onSelectPhoto={onSelectPhoto}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPress={handleLongPress}
              onToggleGroup={handleToggleGroup}
            />
          )}
        </PageContainer>
      )}

      <SimpleFAB
        label="Subir fotos"
        icon={<Plus className="w-5 h-5" />}
        onClick={() => fileInputRef.current?.click()}
        hidden={activeTab !== 'fotos' || selectionMode}
      />

      <BatchPhotoActionsBar
        active={selectionMode}
        photos={photos}
        selectedIds={selectedIds}
        moveableChapters={moveableChapters}
        personas={personas}
        onBatchMove={onBatchMove}
        onBatchChangeDate={onBatchChangeDate}
        onBatchCreateChapter={onBatchCreateChapter}
        onBatchTagPersonas={onBatchTagPersonas}
        onDone={exitSelection}
      />

      {showEditModal && (
        <EditInfoModal
          title="Editar información del capítulo"
          initialName={chapter.name}
          namePlaceholder="Nombre del capítulo"
          onCancel={() => setShowEditModal(false)}
          onSave={handleSaveChapterInfo}
          isSubmitting={isSavingChapterInfo}
        />
      )}

      {showDeleteModal && (
        <DeleteChapterModal
          photoCount={photos.length}
          recuerdoCount={recuerdos.length}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteChapter}
          isSubmitting={isDeletingChapter}
        />
      )}

      {showCoverPicker && onFetchChapterCoverPhotos && onSetChapterCover && (
        <CoverPhotoPickerModal
          title="Elegir portada del capítulo"
          fetchPage={onFetchChapterCoverPhotos}
          onSelect={onSetChapterCover}
          onCancel={() => setShowCoverPicker(false)}
        />
      )}
    </div>
  );
}
