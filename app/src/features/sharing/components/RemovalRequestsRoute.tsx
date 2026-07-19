import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RemovalRequestsList } from '@/app/components/RemovalRequestsList.tsx';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';

export const RemovalRequestsRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const auth = useAuth();
  const { run } = useAsyncAction();

  const {
    baules,
    removalRequests,
    removePhoto,
    keepPhoto
  } = useAppStore();

  const baul = baules.find(b => b.id === baulId);

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const handleRemove = async (requestId: string, photoId: string): Promise<boolean> => {
    if (!auth.isAuthenticated) return false;
    const result = await run(() => removePhoto(baul.id, requestId, photoId), {
      key: requestId,
      successMessage: 'La foto ha sido eliminada',
      errorMessage: 'Error al eliminar la foto',
    });
    return result.ok;
  };

  const handleKeep = async (requestId: string): Promise<boolean> => {
    if (!auth.isAuthenticated) return false;
    const result = await run(() => keepPhoto(baul.id, requestId), {
      key: requestId,
      successMessage: 'La foto se ha conservado',
      errorMessage: 'Error al conservar la foto',
    });
    return result.ok;
  };

  return (
    <RemovalRequestsList
      requests={removalRequests[baul.id] || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onRemovePhoto={handleRemove}
      onKeepPhoto={handleKeep}
    />
  );
};
