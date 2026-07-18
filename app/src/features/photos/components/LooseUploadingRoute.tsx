import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadingScreen } from '@/app/components/UploadingScreen';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';
import { useAppStore, UploadItemResult } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';

interface LocationState {
  selectedPhotos: SelectedPhoto[];
  succeededCount?: number;
}

export const LooseUploadingRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const location = useLocation();
  const auth = useAuth();
  const { baules, uploadLoosePhotos } = useAppStore();

  const baul = baules.find(b => b.id === baulId);
  const { selectedPhotos, succeededCount: succeededSoFar = 0 } = (location.state as LocationState) || { selectedPhotos: [] };

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const handleUpload = (photos: SelectedPhoto[], onItemSettled: (result: UploadItemResult) => void) => {
    if (!auth.isAuthenticated) return Promise.resolve([]);
    return uploadLoosePhotos(
      baul.id,
      photos.map((p) => ({ clientUploadId: p.id, file: p.file, caption: p.caption, date: p.date })),
      onItemSettled
    );
  };

  const handleSettled = (results: UploadItemResult[]) => {
    const failed = results.filter((r) => r.error);
    const succeededCount = succeededSoFar + (results.length - failed.length);

    if (failed.length === 0) {
      navigate(`/baules/${baul.id}/fotos-sueltas/exito?count=${succeededCount}`);
      return;
    }

    const failedPhotos = selectedPhotos.filter((p) => failed.some((f) => f.clientUploadId === p.id));
    navigate(`/baules/${baul.id}/fotos-sueltas/error`, { state: { failedPhotos, succeededCount } });
  };

  return (
    <UploadingScreen photos={selectedPhotos} onUpload={handleUpload} onSettled={handleSettled} />
  );
};
