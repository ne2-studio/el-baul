import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Hero } from '@/design-system/layouts/Hero';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { RoleBadge } from '@/design-system/components/data-display/Badges';
import { PersonaSettingsMenuContainer } from '@/features/people/containers/PersonaSettingsMenuContainer';
import { PersonaBiografiaTabContainer } from '@/features/people/containers/PersonaBiografiaTabContainer';
import { PersonaFotosTabContainer } from '@/features/people/containers/PersonaFotosTabContainer';
import { useElementHeight } from '@/hooks/useElementHeight';
import { usePersonaScope } from '@/hooks/usePersonaScope';
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

  const [activeTab, setActiveTab] = useState<'biografia' | 'fotos'>('biografia');
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();

  // Bloquea hasta tener tanto la persona como sus fotos, para que el badge de recuento del
  // Tabbar sea correcto desde el primer render y no haya un hueco de carga al entrar en la
  // pestaña de fotos — ver docs/architecture/frontend.md y usePersonaScope.
  const { persona, photos, isLoading, loadFailed, retry } = usePersonaScope(baulId, personaId);

  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;

  if (!baulId || !personaId || !persona) {
    if (loadFailed) {
      return (
        <ErrorScreen
          title="No se ha podido cargar la ficha"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={retry}
        />
      );
    }
    return <div className="p-8 text-center">No se ha encontrado la persona.</div>;
  }

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
          { key: 'fotos', label: 'Fotos', count: (photos || []).length },
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
              personaId={personaId}
              onSelectPhoto={(photo) => openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/personas/${personaId}`, photo.id))}
            />
          )}
        </PageContainer>
      </Tabbar>
    </div>
  );
};
