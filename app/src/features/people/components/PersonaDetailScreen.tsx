import React, { useState } from 'react';
import { BookOpen, ImageIcon, Pencil } from 'lucide-react';
import { Persona, Photo } from '@/types';
import { getPersonaPermissions, PersonaPermissions } from '@/utils/roleUtils';
import { useElementHeight } from '@/hooks/useElementHeight';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { Hero } from '@/design-system/layouts/Hero';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { RoleBadge } from '@/design-system/components/data-display/Badges';
import { PersonaSettingsMenuContainer } from '@/features/people/containers/PersonaSettingsMenuContainer';

interface PersonaDetailScreenProps {
  baulId: string;
  persona: Persona;
  permissions?: PersonaPermissions;
  onBack: () => void;
  onEditBiografia: () => void;
  /** Fotos etiquetadas con esta persona, ya ordenadas cronológicamente por el backend. */
  photos: Photo[];
  onSelectPhoto: (photo: Photo) => void;
}

export function PersonaDetailScreen({
  baulId,
  persona,
  permissions = getPersonaPermissions({ persona }),
  onBack,
  onEditBiografia,
  photos,
  onSelectPhoto,
}: PersonaDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<'biografia' | 'fotos'>('biografia');
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const displayName = persona.name || persona.nickname;
  const isPending = persona.status === 'pending';
  const hasNoAccess = persona.role === 'sin_acceso' || persona.status === 'sin_acceso';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
        variant="row"
        onBack={onBack}
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
          {!isPending && (
            <RoleBadge role={persona.role} tone="onImage" />
          )}
          <span className="text-xs text-white/70">
            {hasNoAccess ? 'Forma parte de la historia familiar' : isPending ? 'Todavía no se ha unido' : 'Ya pertenece al baúl'}
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
              <PhotoSwimlanes photos={photos} onSelectPhoto={onSelectPhoto} />
            )
          )}
        </PageContainer>
      </Tabbar>

      <SimpleFAB
        label="Editar biografía"
        icon={<Pencil className="w-5 h-5" />}
        onClick={onEditBiografia}
        hidden={activeTab !== 'biografia' || !permissions.canEditPersonaBiography}
      />
    </div>
  );
}
