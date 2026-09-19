import React, { useState } from 'react';
import { BackButton } from '@/design-system/components/navigation/BackButton';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { WorkspaceSwitcherContainer } from '@/features/baules/containers/WorkspaceSwitcherContainer';
import { BaulSettingsMenuContainer } from '@/features/baules/containers/BaulSettingsMenuContainer';
import { MyPhotosGalleryContainer } from '@/features/photos/containers/MyPhotosGalleryContainer';
import { MyPhotosBatchActionsContainer } from '@/features/photos/containers/MyPhotosBatchActionsContainer';
import { PhotoAsset } from '@/types';

// "Mis fotos" (docs/.backlog issue #62) — the first route that belongs to the authenticated
// app but not to any one baúl. Modeled on BaulRoute's own header (workspace switcher instead
// of a back button, settings menu trailing) but deliberately has no Hero and no Tabbar: there
// are no baúl-specific tabs (Historia/Fotos/Capítulos/Familia) to render for a screen that
// isn't a baúl — see docs/DESIGN.md's "Content screen composition".
//
// Multi-selection (Slice 5, docs/.backlog issue #62) is kept inline here, same reasoning as
// BaulRoute keeping its own selectionMode/selectedIds instead of inside BaulPhotosTabContainer:
// the header (icon/counter vs. settings menu) and the batch action bar both need this state.
export const MisFotosRoute: React.FC = () => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
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

  const handleLongPress = (assetId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([assetId]));
  };

  // Selecciona/deselecciona un swimlane entero de golpe — mismo comportamiento que
  // BaulRoute.handleToggleGroup.
  const handleToggleGroup = (groupPhotos: PhotoAsset[]) => {
    const groupIds = groupPhotos.map((p) => p.id);
    const allSelected = groupIds.length > 0 && groupIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      groupIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      setSelectionMode(next.size > 0);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="row"
        leading={
          selectionMode
            ? <BackButton onClick={exitSelection} label="Cancelar" />
            : <WorkspaceSwitcherContainer activeBaul={null} activePersonalKey="mis-fotos" />
        }
        trailing={
          selectionMode ? (
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? 'seleccionada' : 'seleccionadas'}
            </span>
          ) : (
            <BaulSettingsMenuContainer />
          )
        }
      />

      <PageContainer className="py-6 pb-28">
        <MyPhotosGalleryContainer
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onLongPress={handleLongPress}
          onToggleGroup={handleToggleGroup}
        />
      </PageContainer>

      <MyPhotosBatchActionsContainer active={selectionMode} selectedIds={selectedIds} onDone={exitSelection} />
    </div>
  );
};
