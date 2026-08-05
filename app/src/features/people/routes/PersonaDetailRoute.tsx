import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Hero } from '@/design-system/layouts/Hero';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { RoleBadge } from '@/design-system/components/data-display/Badges';
import { PersonaSettingsMenuContainer } from '@/features/people/containers/PersonaSettingsMenuContainer';
import { PersonaBiografiaTabContainer } from '@/features/people/containers/PersonaBiografiaTabContainer';
import { PersonaFotosTabContainer } from '@/features/people/containers/PersonaFotosTabContainer';
import { useElementHeight } from '@/hooks/useElementHeight';
import { usePersonasStore } from '@/store/usePersonasStore';
import { loadPersonas } from '@/features/people/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// PersonaDetailRoute ensambla el chrome (PageHeader/Hero/Tabbar) directamente y compone las
// pestañas biografía/fotos como containers autosuficientes — no hay un componente "shell"
// intermedio en components/, porque su único trabajo habría sido recomponer containers, lo
// cual ya no es presentacional de verdad aunque viva ahí — ver la regla de containers/ en
// docs/architecture/frontend.md.
export const PersonaDetailRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, personaId } = useParams();
  const returnTab = (location.state as { returnTab?: 'capitulos' | 'personas' | 'recuerdos' } | null)?.returnTab ?? 'personas';
  // Solo para el badge de recuento del Tabbar — PersonaFotosTabContainer lee los datos
  // completos él mismo.
  const { personas, personaPhotos } = usePersonasStore();
  const { run } = useAsyncAction();

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'biografia' | 'fotos'>('biografia');
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();

  const persona = (personas[baulId || ''] || []).find(u => u.id === personaId);

  useEffect(() => {
    if (!baulId || persona) return;

    setIsLoading(true);
    run(() => loadPersonas(baulId), { key: 'personas', errorMessage: 'Error al cargar la ficha' }).finally(() =>
      setIsLoading(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, persona, loadPersonas]);

  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;
  if (!baulId || !personaId || !persona) return <div className="p-8 text-center">No se ha encontrado la persona.</div>;

  const displayName = persona.name || persona.nickname;
  const isPersonaPending = persona.status === 'pending';
  const hasNoAccess = persona.role === 'sin_acceso' || persona.status === 'sin_acceso';

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
          { key: 'fotos', label: 'Fotos', count: (personaPhotos[personaId] || []).length },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as 'biografia' | 'fotos')}
        top={headerHeight}
      >
        <PageContainer className="py-8 space-y-6 pb-28">
          {activeTab === 'biografia' && (
            <PersonaBiografiaTabContainer baulId={baulId} persona={persona} />
          )}

          {activeTab === 'fotos' && (
            <PersonaFotosTabContainer
              baulId={baulId}
              personaId={personaId}
              onSelectPhoto={(photo) => openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/personas/${personaId}`, photo.id))}
            />
          )}
        </PageContainer>
      </Tabbar>
    </div>
  );
};
