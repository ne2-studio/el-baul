import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, ImageIcon, Pencil } from 'lucide-react';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { Hero } from '@/design-system/layouts/Hero';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { RoleBadge } from '@/design-system/components/data-display/Badges';
import { PersonaSettingsMenuContainer } from '@/features/people/containers/PersonaSettingsMenuContainer';
import { EditBiografiaModal } from '@/features/people/components/EditBiografiaModal';
import { useElementHeight } from '@/hooks/useElementHeight';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { loadPersonas, loadPersonaPhotos, updatePersonaBiografia } from '@/features/people/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { getPersonaPermissions } from '@/utils/roleUtils';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// PersonaDetailRoute ensambla el chrome (PageHeader/Hero/Tabbar) directamente — no hay un
// componente "shell" intermedio en components/, porque su único trabajo habría sido
// recomponer PersonaSettingsMenuContainer, lo cual ya no es presentacional de verdad aunque
// viva ahí — ver la regla de containers/ en docs/architecture/frontend.md.
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
  const [activeTab, setActiveTab] = useState<'biografia' | 'fotos'>('biografia');
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();

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

  const permissions = getPersonaPermissions({ currentBaulRole: baul?.role, persona });
  const photos = personaPhotos[personaId] || [];
  const displayName = persona.name || persona.nickname;
  const isPersonaPending = persona.status === 'pending';
  const hasNoAccess = persona.role === 'sin_acceso' || persona.status === 'sin_acceso';

  const handleSaveBiografia = async (biografia: string) => {
    const result = await run(() => updatePersonaBiografia(baulId, personaId, biografia), {
      key: 'save',
      successMessage: 'Biografía actualizada',
      errorMessage: 'Error al actualizar la biografía',
    });
    if (result.ok) setIsEditingBiografia(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
        variant="row"
        onBack={() => navigate(`/baules/${baulId}`, { state: { activeTab: returnTab } })}
        trailing={<PersonaSettingsMenuContainer baulId={baulId} persona={persona} />}
      />

      <Hero
        imageUrl={persona.avatarUrl}
        blurUpscaledImage={false}
        title={displayName}
      >
        {persona.name && (
          <p className="text-sm text-white/80 mt-1 italic">"{persona.nickname}"</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {!isPersonaPending && (
            <RoleBadge role={persona.role} tone="onImage" />
          )}
          <span className="text-xs text-white/70">
            {hasNoAccess ? 'Forma parte de la historia familiar' : isPersonaPending ? 'Todavía no se ha unido' : 'Ya pertenece al baúl'}
          </span>
        </div>
        {hasNoAccess && (
          <p className="mt-3 max-w-sm rounded-2xl bg-black/35 px-3 py-2 text-xs leading-relaxed text-white/90 backdrop-blur-sm">
            Forma parte de la historia familiar, pero no puede ver ni colaborar en el contenido.
          </p>
        )}
      </Hero>

      <Tabbar
        tabs={[
          { key: 'biografia', label: 'Biografía' },
          { key: 'fotos', label: 'Fotos', count: photos.length },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as 'biografia' | 'fotos')}
        top={headerHeight}
      >
        <PageContainer className="py-8 space-y-6 pb-28">
          {activeTab === 'biografia' && (
            persona.biografia ? (
              <div className="bg-card rounded-2xl border border-border p-6">
                <p
                  className="text-xs text-muted-foreground uppercase tracking-wide mb-4"
                  style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
                >
                  Biografía
                </p>
                <p className="text-foreground whitespace-pre-wrap">{persona.biografia}</p>
              </div>
            ) : (
              <EmptyState
                icon={<BookOpen className="w-20 h-20" strokeWidth={1.5} />}
                title="Todavía no hay biografía"
                subtitle={`Este usuario aún no tiene biografía${permissions.canEditPersonaBiography ? ', ¡añádela!' : '.'}`}
              />
            )
          )}

          {activeTab === 'fotos' && (
            photos.length === 0 ? (
              <EmptyState
                icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />}
                title="Todavía no hay fotos"
                subtitle="Las fotos en las que etiquetes a esta persona aparecerán aquí"
              />
            ) : (
              <PhotoSwimlanes
                photos={photos}
                onSelectPhoto={(photo) => openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/personas/${personaId}`, photo.id))}
              />
            )
          )}
        </PageContainer>
      </Tabbar>

      <SimpleFAB
        label="Editar biografía"
        icon={<Pencil className="w-5 h-5" />}
        onClick={() => setIsEditingBiografia(true)}
        hidden={activeTab !== 'biografia' || !permissions.canEditPersonaBiography}
      />

      {isEditingBiografia && (
        <EditBiografiaModal
          initialBiografia={persona.biografia || ''}
          onCancel={() => setIsEditingBiografia(false)}
          onSave={handleSaveBiografia}
          isSubmitting={isPending('save')}
        />
      )}
    </div>
  );
};
