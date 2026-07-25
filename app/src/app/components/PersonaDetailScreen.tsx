import React, { useRef, useState } from 'react';
import { BookOpen, Camera, ChevronLeft, ImageIcon, Loader2, MoreVertical, Pencil, Share2, UserCog, UserX } from 'lucide-react';
import { Persona, BaulRole } from '@/types';
import { getRoleDisplayName } from '@/utils/roleUtils';
import { useElementHeight } from '@/hooks/useElementHeight';
import { EmptyState } from './EmptyState';
import { SimpleFAB } from './FAB';
import { ManageAccessModal } from './ManageAccessModal';
import { PageContainer } from './PageContainer';
import { Photo } from './PhotosView';
import { PhotoSwimlanes } from './PhotoSwimlanes';
import { RevokeAccessModal } from './RevokeAccessModal';
import { StickyHeader } from './StickyHeader';
import { TabButton } from './TabButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface PersonaDetailScreenProps {
  persona: Persona;
  isAdmin: boolean;
  onBack: () => void;
  onEditInfo: () => void;
  onEditBiografia: () => void;
  onUploadAvatar: (file: File) => void;
  isUploadingAvatar?: boolean;
  onShareInvite: () => void;
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
  isAdmin,
  onBack,
  onEditInfo,
  onEditBiografia,
  onUploadAvatar,
  isUploadingAvatar = false,
  onShareInvite,
  onChangeRole,
  onRevokeAccess,
  photos,
  onSelectPhoto,
}: PersonaDetailScreenProps) {
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showManageAccessModal, setShowManageAccessModal] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [activeTab, setActiveTab] = useState<'biografia' | 'fotos'>('biografia');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const displayName = persona.name || persona.nickname;
  const isPending = persona.status === 'pending';
  const canManage = isAdmin && persona.role !== 'custodio';

  const handleConfirmRevoke = async () => {
    setIsRevoking(true);
    const ok = await onRevokeAccess();
    setIsRevoking(false);
    if (ok) setShowRevokeModal(false);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadAvatar(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyHeader ref={headerRef}>
        <PageContainer className="py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Volver</span>
            </button>

            {(persona.canEdit || canManage) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
                    aria-label="Opciones de la persona"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {persona.canEdit && (
                    <DropdownMenuItem onClick={onEditInfo}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar información
                    </DropdownMenuItem>
                  )}

                  {persona.canEdit && (
                    <DropdownMenuItem
                      onClick={() => avatarInputRef.current?.click()}
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

                  {persona.canEdit && canManage && <DropdownMenuSeparator />}

                  {canManage && isPending && (
                    <DropdownMenuItem onClick={onShareInvite}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Compartir invitación
                    </DropdownMenuItem>
                  )}

                  {canManage && !isPending && (
                    <DropdownMenuItem onClick={() => setShowManageAccessModal(true)}>
                      <UserCog className="w-4 h-4 mr-2" />
                      Gestionar acceso
                    </DropdownMenuItem>
                  )}

                  {canManage && <DropdownMenuSeparator />}

                  {canManage && (
                    <DropdownMenuItem variant="destructive" onClick={() => setShowRevokeModal(true)}>
                      <UserX className="w-4 h-4 mr-2" />
                      Quitar acceso
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </PageContainer>
      </StickyHeader>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
        disabled={isUploadingAvatar}
      />

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: '210px' }}>
        {persona.avatarUrl ? (
          <img src={persona.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/30 to-foreground/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 pb-5">
          <PageContainer>
            <h1 className="text-3xl font-serif text-white leading-tight" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>
              {displayName}
            </h1>
            {persona.name && (
              <p className="text-sm text-white/80 mt-1 italic">"{persona.nickname}"</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {!isPending && (
                <span className="text-xs text-white font-medium px-2 py-1 rounded-full bg-white/20">
                  {getRoleDisplayName(persona.role)}
                </span>
              )}
              <span className="text-xs text-white/70">
                {isPending ? 'Todavía no se ha unido' : 'Ya pertenece al baúl'}
              </span>
            </div>
          </PageContainer>
        </div>
      </div>

      {/* Tabs — same sticky underline pattern as ChaptersView.tsx / PhotosView.tsx */}
      <div
        className="sticky bg-background/90 backdrop-blur-sm z-[9] border-b border-border"
        style={{ top: headerHeight }}
      >
        <PageContainer className="overflow-x-auto scrollbar-hide">
          <div className="flex w-max md:w-full">
            <TabButton label="Biografía" count={0} active={activeTab === 'biografia'} onClick={() => setActiveTab('biografia')} />
            <TabButton label="Fotos" count={photos.length} active={activeTab === 'fotos'} onClick={() => setActiveTab('fotos')} />
          </div>
        </PageContainer>
      </div>

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
              subtitle={`Este usuario aún no tiene biografía${persona.canEdit ? ', ¡añádela!' : '.'}`}
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

      <SimpleFAB
        label="Editar biografía"
        icon={<Pencil className="w-5 h-5" />}
        onClick={onEditBiografia}
        hidden={activeTab !== 'biografia' || !persona.canEdit}
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
