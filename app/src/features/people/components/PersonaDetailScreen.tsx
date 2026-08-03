import React, { useState } from 'react';
import { BookOpen, Camera, ImageIcon, Loader2, MoreVertical, Pencil, UserCog, UserPlus, UserX } from 'lucide-react';
import { Persona, BaulRole, Photo } from '@/types';
import { getPersonaPermissions, PersonaPermissions } from '@/utils/roleUtils';
import { useElementHeight } from '@/hooks/useElementHeight';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { ManageAccessModal } from '@/features/sharing/components/ManageAccessModal';
import { Hero } from '@/design-system/layouts/Hero';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { RevokeAccessModal } from '@/features/sharing/components/RevokeAccessModal';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { Button } from '@/design-system/components/actions/Button';
import { RoleBadge } from '@/design-system/components/data-display/Badges';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';

interface PersonaDetailScreenProps {
  persona: Persona;
  permissions?: PersonaPermissions;
  onBack: () => void;
  onEditInfo: () => void;
  onEditBiografia: () => void;
  onChangeAvatar: () => void;
  isUploadingAvatar?: boolean;
  onChangeRole: (role: BaulRole) => void;
  /** Devuelve si la revocación tuvo éxito — el modal se queda abierto (con spinner)
   * hasta saberlo, y solo se cierra por sí solo si el resultado fue true. */
  onRevokeAccess: () => Promise<boolean>;
  /** Fotos etiquetadas con esta persona, ya ordenadas cronológicamente por el backend. */
  photos: Photo[];
  onSelectPhoto: (photo: Photo) => void;
}

export function PersonaDetailScreen({
  persona,
  permissions = getPersonaPermissions({ persona }),
  onBack,
  onEditInfo,
  onEditBiografia,
  onChangeAvatar,
  isUploadingAvatar = false,
  onChangeRole,
  onRevokeAccess,
  photos,
  onSelectPhoto,
}: PersonaDetailScreenProps) {
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showManageAccessModal, setShowManageAccessModal] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [activeTab, setActiveTab] = useState<'biografia' | 'fotos'>('biografia');
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const displayName = persona.name || persona.nickname;
  const isPending = persona.status === 'pending';
  const hasNoAccess = persona.role === 'sin_acceso' || persona.status === 'sin_acceso';

  const handleConfirmRevoke = async () => {
    setIsRevoking(true);
    const ok = await onRevokeAccess();
    setIsRevoking(false);
    if (ok) setShowRevokeModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
        variant="row"
        onBack={onBack}
        trailing={
          (permissions.canEditPersonaInfo || permissions.canManagePersona) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="plain"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
                  aria-label="Opciones de la persona"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {permissions.canEditPersonaInfo && (
                  <DropdownMenuItem onClick={onEditInfo}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar información
                  </DropdownMenuItem>
                )}

                {permissions.canUploadPersonaAvatar && (
                  <DropdownMenuItem
                    onClick={onChangeAvatar}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 mr-2" />
                    )}
                    Cambiar foto de perfil
                  </DropdownMenuItem>
                )}

                {permissions.canEditPersonaInfo && permissions.canManagePersona && <DropdownMenuSeparator />}

                {permissions.canChangePersonaRole && (
                  <DropdownMenuItem onClick={() => setShowManageAccessModal(true)}>
                    <UserCog className="w-4 h-4 mr-2" />
                    Gestionar acceso
                  </DropdownMenuItem>
                )}

                {permissions.canRestorePersonaAccess && (
                  <DropdownMenuItem onClick={() => onChangeRole('colaborador')}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Permitir invitación
                  </DropdownMenuItem>
                )}

                {permissions.canManagePersona && <DropdownMenuSeparator />}

                {permissions.canRevokePersonaAccess && (
                  <DropdownMenuItem variant="destructive" onClick={() => setShowRevokeModal(true)}>
                    <UserX className="w-4 h-4 mr-2" />
                    Revocar acceso
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
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

      {showRevokeModal && (
        <RevokeAccessModal
          userName={displayName}
          isSubmitting={isRevoking}
          onConfirm={handleConfirmRevoke}
          onCancel={() => setShowRevokeModal(false)}
        />
      )}

      {showManageAccessModal && (
        <ManageAccessModal
          role={persona.role}
          onChangeRole={onChangeRole}
          onCancel={() => setShowManageAccessModal(false)}
        />
      )}
    </div>
  );
}
