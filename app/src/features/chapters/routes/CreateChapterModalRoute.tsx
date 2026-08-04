import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreateChapterModal } from '@/features/chapters/components/CreateChapterModal';
import { useBaulesStore } from '@/store/useBaulesStore';
import { createChapter } from '@/features/chapters/useCases';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';

export const CreateChapterModalRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const auth = useAuth();
  const { run, isPending } = useAsyncAction();

  const { baules } = useBaulesStore();
  const baul = baules.find(b => b.id === baulId);

  if (!baul) return <div className="p-8 text-center">Cargando baúl...</div>;

  const handleSave = async (name: string) => {
    if (!auth.isAuthenticated) return;

    const result = await run(() => createChapter(baul.id, name), {
      errorMessage: 'Error al crear el capítulo',
    });
    if (result.ok) navigate(`/baules/${baul.id}`);
  };

  return (
    <CreateChapterModal
      onCancel={() => navigate(`/baules/${baul.id}`)}
      onSave={handleSave}
      isSubmitting={isPending()}
    />
  );
};
