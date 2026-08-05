import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PersonaDetailScreen } from '@/features/people/components/PersonaDetailScreen';
import { EditBiografiaModal } from '@/features/people/components/EditBiografiaModal';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { loadPersonas, loadPersonaPhotos, updatePersonaBiografia } from '@/features/people/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { getPersonaPermissions } from '@/utils/roleUtils';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

export const PersonaDetailRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, personaId } = useParams();
  const returnTab = (location.state as { returnTab?: 'capitulos' | 'personas' | 'recuerdos' } | null)?.returnTab ?? 'personas';
  const { baules } = useBaulesStore();
  const { personas, personaPhotos } = usePersonasStore();
  const { run, isPending } = useAsyncAction();

  const [isLoading, setIsLoading] = useState(false);
  const [isEditingBiografia, setIsEditingBiografia] = useState(false);

  const baul = baules.find(b => b.id === baulId);
  const persona = (personas[baulId || ''] || []).find(u => u.id === personaId);

  useEffect(() => {
    if (!baulId || persona) return;

    setIsLoading(true);
    run(() => loadPersonas(baulId), { key: 'personas', errorMessage: 'Error al cargar la ficha' }).finally(() =>
      setIsLoading(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, persona, loadPersonas]);

  useEffect(() => {
    if (!baulId || !personaId || personaPhotos[personaId]) return;
    // Distinct key — useAsyncAction.run() shares a default key across unkeyed calls, and
    // this effect can fire in the same flush as the one above (e.g. on first mount with
    // nothing cached yet), so without this the second call would silently no-op.
    run(() => loadPersonaPhotos(baulId, personaId), { key: 'persona-photos', errorMessage: 'Error al cargar las fotos' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, personaId, personaPhotos, loadPersonaPhotos]);

  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;
  if (!baulId || !personaId || !persona) return <div className="p-8 text-center">No se ha encontrado la persona.</div>;

  const personaPermissions = getPersonaPermissions({ currentBaulRole: baul?.role, persona });

  const handleSaveBiografia = async (biografia: string) => {
    const result = await run(() => updatePersonaBiografia(baulId, personaId, biografia), {
      key: 'save',
      successMessage: 'Biografía actualizada',
      errorMessage: 'Error al actualizar la biografía',
    });
    if (result.ok) setIsEditingBiografia(false);
  };

  return (
    <>
      <PersonaDetailScreen
        baulId={baulId}
        persona={persona}
        permissions={personaPermissions}
        onBack={() => navigate(`/baules/${baulId}`, { state: { activeTab: returnTab } })}
        onEditBiografia={() => setIsEditingBiografia(true)}
        photos={personaPhotos[personaId] || []}
        onSelectPhoto={(photo) => openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/personas/${personaId}`, photo.id))}
      />
      {isEditingBiografia && (
        <EditBiografiaModal
          initialBiografia={persona.biografia || ''}
          onCancel={() => setIsEditingBiografia(false)}
          onSave={handleSaveBiografia}
          isSubmitting={isPending('save')}
        />
      )}
    </>
  );
};
