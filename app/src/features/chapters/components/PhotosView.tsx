import React, { useRef, useState } from 'react';
import { useElementHeight } from '@/hooks/useElementHeight';
import { useFileInputSelection } from '@/hooks/useFileInputSelection';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { EditInfoModal } from '@/design-system/patterns/forms/EditInfoModal';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { StickyHeader } from '@/design-system/layouts/StickyHeader';
import { TabButton } from '@/design-system/components/navigation/TabButton';
import { ChevronLeft, Plus, ImageIcon, MessageCircle, CheckSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { SelectedPhoto } from '@/features/photos/uploadFlow';
import { DeleteChapterModal } from '@/features/chapters/components/DeleteChapterModal';
import { CoverPhotoPickerModal } from '@/features/photos/components/CoverPhotoPickerModal';
import { RecuerdosFeed } from '@/features/memories/components/RecuerdosFeed';
import { BatchPhotoActionsBar } from '@/features/photos/components/BatchPhotoActionsBar';
import { Chapter, Photo, PhotoDate, Persona, Recuerdo } from '@/types';
import { formatDateRange } from '@/app/utils/timeUtils';
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
}

export function PhotosView({
  chapter, photos, onBack, onSelectPhoto, onAddPhotos, onPhotosDropped, allChapters = [], onBatchMove, onBatchChangeDate,
  onBatchCreateChapter, personas = [], onBatchTagPersonas, onUpdateChapterInfo, onDeleteChapter, onFetchChapterCoverPhotos,
  onSetChapterCover, recuerdos = [], onAddRecuerdo, onUserClick,
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
      next.has(id) ? next.delete(id) : next.add(id);
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
      {/* Sticky header — back + actions */}
      <StickyHeader ref={headerRef}>
        <PageContainer className="py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={selectionMode ? exitSelection : onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">{selectionMode ? 'Cancelar' : 'Volver'}</span>
            </button>

            {selectionMode ? (
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} {selectedIds.size === 1 ? 'seleccionada' : 'seleccionadas'}
              </span>
            ) : onUpdateChapterInfo && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
                    aria-label="Opciones del capítulo"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
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
            )}
          </div>
        </PageContainer>
      </StickyHeader>

      {/* Hero — shown when not in selection mode */}
      {!selectionMode && (
        <div className="relative overflow-hidden" style={{ height: '210px' }}>
          {(chapter.featuredCoverPhotoUrl ?? chapter.coverPhotoUrl) ? (
            <img
              src={chapter.featuredCoverPhotoUrl ?? chapter.coverPhotoUrl}
              alt=""
              className="hero-cover-image absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/30 to-foreground/50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 pb-5">
            <PageContainer>
              <h1 className="text-3xl font-serif text-white leading-tight" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>
                {chapter.name}
              </h1>
              {chapter.minDate && chapter.maxDate && (
                <p className="text-xs text-white/65 mt-1 font-medium tracking-wide">
                  {formatDateRange(chapter.minDate, chapter.maxDate)}
                </p>
              )}
            </PageContainer>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Tabs — only when the caller supports a Recuerdos feed (real chapters, not the loose-photos virtual one) */}
      {!selectionMode && hasRecuerdosTab && (
        <div
          className="sticky bg-background/90 backdrop-blur-sm z-[9] border-b border-border"
          style={{ top: headerHeight }}
        >
          <PageContainer className="overflow-x-auto scrollbar-hide">
            <div className="flex w-max md:w-full">
              <TabButton label="Fotos" count={photos.length} active={activeTab === 'fotos'} onClick={() => setActiveTab('fotos')} />
              <TabButton label="Recuerdos" count={recuerdos.length} active={activeTab === 'recuerdos'} onClick={() => setActiveTab('recuerdos')} />
            </div>
          </PageContainer>
        </div>
      )}

      {/* Content */}
      <PageContainer className="py-6 pb-28">
        {!selectionMode && !hasRecuerdosTab && totalRecuerdos > 0 && (
          <div className="flex items-center gap-1.5 mb-5 -mt-1">
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground/60" strokeWidth={1.5} />
            <span className="text-xs text-muted-foreground/75">
              {totalRecuerdos} {totalRecuerdos === 1 ? 'recuerdo' : 'recuerdos'} en este capítulo
            </span>
          </div>
        )}

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

        {hasRecuerdosTab && (
          <RecuerdosFeed
            active={activeTab === 'recuerdos'}
            photos={photos}
            recuerdos={recuerdos}
            onSelectPhoto={onSelectPhoto}
            onAddRecuerdo={onAddRecuerdo}
            onUserClick={onUserClick}
            selectionMode={selectionMode}
          />
        )}
      </PageContainer>

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
