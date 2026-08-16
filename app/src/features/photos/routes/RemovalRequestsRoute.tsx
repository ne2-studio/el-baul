import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RemovalRequestsList } from '@/features/photos/components/RemovalRequestsList';
import { removePhoto, keepPhoto } from '@/features/photos/useCases';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';

export const RemovalRequestsRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const auth = useAuth();
  const { run } = useAsyncAction();

  const baulScope = useBaulScope(baulId);
  const { removalRequests } = baulScope;

  const guard = guardBaulScope(baulScope);
  if (!guard.ready) return guard.screen;
  const { baul } = guard;

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
      requests={removalRequests || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onRemovePhoto={handleRemove}
      onKeepPhoto={handleKeep}
    />
  );
};
