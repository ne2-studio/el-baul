import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreateAlbumForm } from '@/app/components/CreateAlbumForm';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';

export const CreateAlbumFormRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const auth = useAuth();
  const { run, isPending } = useAsyncAction();

  const { baules, createAlbum } = useAppStore();
  const baul = baules.find(b => b.id === baulId);

  if (!baul) return <div className="p-8 text-center">Cargando baúl...</div>;

  const handleSubmit = async (name: string, description: string) => {
    if (!auth.isAuthenticated) return;

    const result = await run(() => createAlbum(baul.id, name, description), {
      errorMessage: 'Error al crear el capítulo',
    });
    if (result.ok) navigate(`/baules/${baul.id}`);
  };

  return (
    <CreateAlbumForm
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSubmit={handleSubmit}
      isSubmitting={isPending()}
    />
  );
};
