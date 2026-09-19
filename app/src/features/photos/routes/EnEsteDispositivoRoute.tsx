import React from 'react';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { WorkspaceSwitcherContainer } from '@/features/baules/containers/WorkspaceSwitcherContainer';
import { DevicePhotoGalleryContainer } from '@/features/photos/containers/DevicePhotoGalleryContainer';

// "En este dispositivo" — a sibling of "Mis fotos" under PERSONAL, not a filter inside it: it
// shows the Android device's own photo library (via the native MediaStore bridge in
// features/photos/native/devicePhotos.ts), which does NOT belong to the user's El Baúl personal
// space and has no PhotoAsset/UserPhotoAsset behind it. Nothing here ever touches the API —
// keep it that way; the moment this needs to save/upload a device photo into El Baúl, that flow
// reuses the existing "Mis fotos" upload wizard (features/photos/routes/MyPhotosUpload*) rather
// than growing its own.
//
// Modeled on MisFotosRoute's header (workspace switcher, no Hero/Tabbar), but deliberately
// simpler: no settings menu (nothing here belongs to this screen to configure) and no
// selection/batch actions (out of scope for this read-only slice).
export const EnEsteDispositivoRoute: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="row"
        leading={<WorkspaceSwitcherContainer activeBaul={null} activePersonalKey="en-este-dispositivo" />}
      />

      <PageContainer className="py-6 pb-28">
        <DevicePhotoGalleryContainer />
      </PageContainer>
    </div>
  );
};
