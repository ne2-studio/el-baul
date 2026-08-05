import React, { useState } from 'react';
import { useElementHeight } from '@/hooks/useElementHeight';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { Hero } from '@/design-system/layouts/Hero';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { Plus, ImageIcon, MessageCircle } from 'lucide-react';
import { ChapterRecuerdosFeedContainer } from '@/features/memories/containers/ChapterRecuerdosFeedContainer';
import { BatchPhotoActionsContainer } from '@/features/photos/containers/BatchPhotoActionsContainer';
import { ChapterSettingsMenuContainer } from '@/features/chapters/containers/ChapterSettingsMenuContainer';
import { Chapter, Photo } from '@/types';
import { formatDateRange } from '@/app/utils/timeUtils';

interface PhotosViewProps {
  chapter: Chapter;
  photos: Photo[];
  /** Photos from the upload the user was just redirected here from — surfaced as a pinned
   * "Añadido recientemente" swimlane above the date-grouped ones. */
  recentlyAddedPhotos?: Photo[];
  baulId: string;
  baulName: string;
  /** null = fotos sueltas virtual chapter — mirrors ChapterRoute's apiChapterId discriminator.
   * Gates the Recuerdos tab (only real chapters have one) and is threaded down to
   * ChapterRecuerdosFeedContainer/BatchPhotoActionsContainer/ChapterSettingsMenuContainer,
   * which own their own data/actions. */
  chapterId: string | null;
  /** Solo para el badge de recuento del Tabbar y el modal de borrado — los datos completos
   * los lee ChapterRecuerdosFeedContainer directamente del store. */
  recuerdosCount?: number;
  onBack: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onUploadPhotos: () => void;
  allChapters?: Chapter[];
}

export function PhotosView({
  chapter, photos, recentlyAddedPhotos, baulId, baulName, chapterId, recuerdosCount = 0, onBack, onSelectPhoto, onUploadPhotos,
  allChapters = [],
}: PhotosViewProps) {
  const totalRecuerdos = chapterId !== null ? recuerdosCount : photos.reduce((sum, photo) => sum + (photo.recuerdoCount || 0), 0);
  const [activeTab, setActiveTab] = useState<'fotos' | 'recuerdos'>('fotos');
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();

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
          ) : (
            <ChapterSettingsMenuContainer
              baulId={baulId}
              chapterId={chapterId}
              chapterName={chapter.name}
              photoCount={photos.length}
              recuerdoCount={recuerdosCount}
              onEnterSelectionMode={() => setSelectionMode(true)}
            />
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

      {/* Tabbar solo para capítulos reales (no el de fotos sueltas virtual) — sin un
          chapterId no hay nada entre lo que hacer swipe. */}
      {chapterId !== null ? (
        <Tabbar
          tabs={[
            { key: 'fotos', label: 'Fotos', count: photos.length },
            { key: 'recuerdos', label: 'Recuerdos', count: recuerdosCount },
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
                  recentlyAddedPhotos={recentlyAddedPhotos}
                  onSelectPhoto={onSelectPhoto}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onLongPress={handleLongPress}
                  onToggleGroup={handleToggleGroup}
                />
              )
            )}

            <ChapterRecuerdosFeedContainer
              active={activeTab === 'recuerdos'}
              baulId={baulId}
              baulName={baulName}
              chapterId={chapterId}
              photos={photos}
              onSelectPhoto={onSelectPhoto}
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
              recentlyAddedPhotos={recentlyAddedPhotos}
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
        onClick={onUploadPhotos}
        hidden={activeTab !== 'fotos' || selectionMode}
      />

      <BatchPhotoActionsContainer
        active={selectionMode}
        baulId={baulId}
        chapterId={chapterId}
        photos={photos}
        selectedIds={selectedIds}
        moveableChapters={moveableChapters}
        onDone={exitSelection}
      />
    </div>
  );
}
