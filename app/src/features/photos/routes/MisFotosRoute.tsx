import React from 'react';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { WorkspaceSwitcherContainer } from '@/features/baules/containers/WorkspaceSwitcherContainer';
import { BaulSettingsMenuContainer } from '@/features/baules/containers/BaulSettingsMenuContainer';
import { MyPhotosGalleryContainer } from '@/features/photos/containers/MyPhotosGalleryContainer';

// "Mis fotos" (docs/.backlog issue #62) — the first route that belongs to the authenticated
// app but not to any one baúl. Modeled on BaulRoute's own header (workspace switcher instead
// of a back button, settings menu trailing) but deliberately has no Hero and no Tabbar: there
// are no baúl-specific tabs (Historia/Fotos/Capítulos/Familia) to render for a screen that
// isn't a baúl — see docs/DESIGN.md's "Content screen composition".
export const MisFotosRoute: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="row"
        leading={<WorkspaceSwitcherContainer activeBaul={null} />}
        trailing={<BaulSettingsMenuContainer />}
      />

      <PageContainer className="py-6 pb-28">
        <MyPhotosGalleryContainer />
      </PageContainer>
    </div>
  );
};
