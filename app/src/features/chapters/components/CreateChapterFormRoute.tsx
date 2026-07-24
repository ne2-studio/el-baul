import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreateChapterForm } from '@/app/components/CreateChapterForm';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';

export const CreateChapterFormRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const auth = useAuth();
  const { run, isPending } = useAsyncAction();

  const { baules, createChapter } = useBaulesStore();
  const baul = baules.find(b => b.id === baulId);

  if (!baul) return <div className="p-8 text-center">Cargando baúl...</div>;

  const handleSubmit = async (name: string) => {
    if (!auth.isAuthenticated) return;

    const result = await run(() => createChapter(baul.id, name), {
      errorMessage: 'Error al crear el capítulo',
    });
    if (result.ok) navigate(`/baules/${baul.id}`);
  };

  return (
    <CreateChapterForm
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSubmit={handleSubmit}
      isSubmitting={isPending()}
    />
  );
};
