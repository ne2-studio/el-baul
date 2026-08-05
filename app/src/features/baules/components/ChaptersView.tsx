import React, { useState } from 'react';
import { useElementHeight } from '@/hooks/useElementHeight';
import { Card } from '@/design-system/components/data-display/Card';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { ExpandableFAB } from '@/design-system/components/actions/FAB';
import { EditInfoModal } from '@/design-system/patterns/forms/EditInfoModal';
import { InviteFamilyModal } from '@/features/sharing/components/InviteFamilyModal';
import { Hero } from '@/design-system/layouts/Hero';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PersonasTabContainer } from '@/features/people/containers/PersonasTabContainer';
import { RecuerdosTabContainer } from '@/features/memories/containers/RecuerdosTabContainer';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { Plus, Upload, BookImage, ImageIcon, Bell, MoreVertical, Pencil, Trash2, Link2 } from 'lucide-react';
import { CoverPhotoPickerModal } from '@/features/photos/components/CoverPhotoPickerModal';
import { Baul, BaulInviteLink, Chapter, Photo } from '@/types';
import { BaulPermissions, getBaulPermissions } from '@/utils/roleUtils';
import type { ToastVariant } from '@/design-system/components/feedback/Toast';
import { IconButton } from '@/design-system/components/actions/IconButton';
import { makeLooseChapterView } from '@/features/baules/components/looseChapterView';
import { ChapterCard } from '@/features/baules/components/ChapterCard';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';
import { CounterBadge } from '@/design-system/components/data-display/Badges';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';

interface LoosePhoto {
  id: string;
  thumbnailUrl: string;
}


interface ChaptersViewProps {
  baul: Baul;
  chapters: Chapter[];
  loosePhotos?: LoosePhoto[];
  /** Solo para el badge de recuento del Tabbar — los datos completos los leen
   * PersonasTabContainer/RecuerdosTabContainer directamente del store. */
  personasCount?: number;
  recuerdosCount?: number;
  baulPermissions?: BaulPermissions;
  initialTab?: 'capitulos' | 'personas' | 'recuerdos';
  onBack: () => void;
  onSelectChapter: (chapter: Chapter) => void;
  onCreateChapter: () => void;
  onToast: (message: string, variant?: ToastVariant) => void;
  onOpenLoosePhotos?: () => void;
  onUploadPhotos?: () => void;
  onOpenChapterFromRecuerdo?: (chapterId: string) => void;
  onRemovalRequests?: () => void;
  pendingRemovalRequestsCount?: number;
  onUpdateBaulInfo?: (name: string, description: string) => Promise<boolean>;
  onRequestBaulDeletion?: () => void;
  onFetchBaulCoverPhotos?: (skip: number, take: number) => Promise<{ photos: Photo[]; hasMore: boolean }>;
  onSetBaulCover?: (photo: Photo) => void;
  onGetInviteLink?: () => Promise<BaulInviteLink>;
  onRegenerateInviteLink?: () => Promise<BaulInviteLink>;
}

export function ChaptersView({
  baul,
  chapters,
  loosePhotos = [],
  personasCount = 0,
  recuerdosCount = 0,
  baulPermissions = getBaulPermissions(baul),
  initialTab = 'capitulos',
  onBack,
  onSelectChapter,
  onCreateChapter,
  onToast,
  onOpenLoosePhotos,
  onUploadPhotos,
  onOpenChapterFromRecuerdo,
  onRemovalRequests,
  pendingRemovalRequestsCount,
  onUpdateBaulInfo,
  onRequestBaulDeletion,
  onFetchBaulCoverPhotos,
  onSetBaulCover,
  onGetInviteLink,
  onRegenerateInviteLink,
}: ChaptersViewProps) {
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showInviteFamilyModal, setShowInviteFamilyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'capitulos' | 'personas' | 'recuerdos'>(initialTab);
  const [isSavingBaulInfo, setIsSavingBaulInfo] = useState(false);
  const looseChapter = makeLooseChapterView(loosePhotos);

  const handleSaveBaulInfo = async (name: string, description: string) => {
    setIsSavingBaulInfo(true);
    const ok = (await onUpdateBaulInfo?.(name, description)) ?? false;
    setIsSavingBaulInfo(false);
    if (ok) setShowEditModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
        variant="row"
        onBack={onBack}
        trailing={
          (onGetInviteLink || onUpdateBaulInfo || (onRemovalRequests && (pendingRemovalRequestsCount ?? 0) > 0) || baulPermissions.canRequestBaulDeletion) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  aria-label="Opciones del baúl"
                  badgeDot={(pendingRemovalRequestsCount ?? 0) > 0}
                >
                  <MoreVertical className="w-5 h-5" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {onGetInviteLink && onRegenerateInviteLink && (
                  <DropdownMenuItem onClick={() => setShowInviteFamilyModal(true)}>
                    <Link2 className="w-4 h-4 mr-2" />
                    Invitar a la familia
                  </DropdownMenuItem>
                )}

                {onGetInviteLink && onRegenerateInviteLink && ((onFetchBaulCoverPhotos && onSetBaulCover) || onUpdateBaulInfo) && (
                  <DropdownMenuSeparator />
                )}

                {onFetchBaulCoverPhotos && onSetBaulCover && (
                  <DropdownMenuItem onClick={() => setShowCoverPicker(true)}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Elegir foto de portada
                  </DropdownMenuItem>
                )}

                {onUpdateBaulInfo && (
                  <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar información del baúl
                  </DropdownMenuItem>
                )}

                {onUpdateBaulInfo && onRemovalRequests && (pendingRemovalRequestsCount ?? 0) > 0 && (
                  <DropdownMenuSeparator />
                )}

                {onRemovalRequests && (pendingRemovalRequestsCount ?? 0) > 0 && (
                  <DropdownMenuItem onClick={onRemovalRequests}>
                    <Bell className="w-4 h-4 mr-2" />
                    <span>Solicitudes de eliminación</span>
                    <CounterBadge count={pendingRemovalRequestsCount ?? 0} className="ml-auto" />
                  </DropdownMenuItem>
                )}

                {baulPermissions.canRequestBaulDeletion && (onUpdateBaulInfo || onRemovalRequests) && <DropdownMenuSeparator />}

                {baulPermissions.canRequestBaulDeletion && (
                  <DropdownMenuItem variant="destructive" onClick={onRequestBaulDeletion}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar baúl
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />

      <Hero imageUrl={baul.coverPhotoUrl} title={baul.name}>
        {baul.description && (
          <p className="text-sm text-white/80 mt-1.5 leading-snug max-w-sm">{baul.description}</p>
        )}
        {!baul.description && onUpdateBaulInfo && (
          <p className="text-sm text-white/40 mt-1.5 italic">Sin descripción · edita desde el menú ···</p>
        )}
      </Hero>

      {/* top es la altura medida del header, no un valor fijo — iOS/WKWebView y
          Android/Chrome WebView renderizan el mismo header a alturas ligeramente distintas. */}
      <Tabbar
        tabs={[
          { key: 'capitulos', label: 'Capítulos', count: chapters.length },
          { key: 'recuerdos', label: 'Recuerdos', count: recuerdosCount },
          { key: 'personas', label: 'Personas', count: personasCount },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as 'capitulos' | 'personas' | 'recuerdos')}
        top={headerHeight}
      >
        <PageContainer className="py-6 pb-28">
          {activeTab === 'capitulos' && (
          chapters.length === 0 && loosePhotos.length === 0 ? (
            <EmptyState
              icon={<BookImage className="w-20 h-20" strokeWidth={1.5} />}
              title="Este baúl está vacío"
              subtitle="Crea tu primer capítulo para empezar a guardar recuerdos"
            />
          ) : (
            <div className="space-y-6">
              {/* Todos los capítulos, agrupados por año de la fecha mínima (ya vienen
                  ordenados del backend por fecha mínima ascendente, así que agrupar
                  consecutivamente preserva ese orden dentro y entre swimlanes) */}
              {chapters.length > 0 && (() => {
                const groups = new Map<string, Chapter[]>();
                for (const chapter of chapters) {
                  const year = chapter.minDate ? String(chapter.minDate.year) : 'Sin año';
                  if (!groups.has(year)) groups.set(year, []);
                  groups.get(year)!.push(chapter);
                }

                return (
                  <div className="space-y-6">
                    {Array.from(groups.entries()).map(([year, yearChapters]) => (
                      <div key={year}>
                        <SwimlaneLabel>{year}</SwimlaneLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {yearChapters.map((chapter) => (
                            <ChapterCard key={chapter.id} chapter={chapter} onClick={() => onSelectChapter(chapter)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Fotos sueltas — capítulo virtual */}
              {looseChapter && (
                <div>
                  <SwimlaneLabel>Otras</SwimlaneLabel>
                  <Card onClick={onOpenLoosePhotos} className="!p-0 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                    {/* Collage cover */}
                    <div className="aspect-[16/10] bg-secondary relative rounded-t-2xl overflow-hidden">
                      <FotosSueltasCollage coverPhotos={looseChapter.coverPhotoUrls} />
                    </div>
                    <div className="p-4 bg-card">
                      <h3 className="font-medium text-lg text-foreground">{looseChapter.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {looseChapter.photoCount} {looseChapter.photoCount === 1 ? 'foto que aún no pertenece' : 'fotos que aún no pertenecen'} a ningún capítulo
                      </p>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )
          )}

          {activeTab === 'personas' && (
            <PersonasTabContainer baulId={baul.id} canCreatePersona={baulPermissions.canCreatePersona} />
          )}

          {activeTab === 'recuerdos' && (
            <RecuerdosTabContainer
              baulId={baul.id}
              baulName={baul.name}
              onOpenChapter={onOpenChapterFromRecuerdo}
            />
          )}
        </PageContainer>
      </Tabbar>

      {activeTab === 'capitulos' && (
        <ExpandableFAB
          actions={[
            {
              label: 'Nuevo capítulo',
              icon: <Plus className="w-4 h-4" />,
              onClick: onCreateChapter,
            },
            ...(onUploadPhotos ? [{
              label: 'Subir fotos',
              icon: <Upload className="w-4 h-4" />,
              onClick: onUploadPhotos,
            }] : []),
          ]}
        />
      )}

      {showInviteFamilyModal && onGetInviteLink && onRegenerateInviteLink && (
        <InviteFamilyModal
          baulName={baul.name}
          fetchLink={onGetInviteLink}
          onRegenerate={onRegenerateInviteLink}
          onCancel={() => setShowInviteFamilyModal(false)}
          onToast={onToast}
        />
      )}

      {showEditModal && (
        <EditInfoModal
          title="Editar información del baúl"
          initialName={baul.name}
          initialDescription={baul.description ?? ''}
          namePlaceholder="Nombre del baúl"
          onCancel={() => setShowEditModal(false)}
          onSave={handleSaveBaulInfo}
          isSubmitting={isSavingBaulInfo}
        />
      )}

      {showCoverPicker && onFetchBaulCoverPhotos && onSetBaulCover && (
        <CoverPhotoPickerModal
          title="Elegir portada del baúl"
          fetchPage={onFetchBaulCoverPhotos}
          onSelect={onSetBaulCover}
          onCancel={() => setShowCoverPicker(false)}
        />
      )}
    </div>
  );
}

// Collage for the "Fotos sueltas" virtual chapter cover
const COLLAGE_COLORS = [
  '#D4B89A', '#C4A882', '#B89870', '#E8D5C0', '#C8B090', '#D8C0A0', '#BCA878', '#E0CCAA', '#CAB088',
];

function FotosSueltasCollage({ coverPhotos }: { coverPhotos: string[] }) {
  const cells = Array.from({ length: 9 }, (_, i) => coverPhotos[i] ?? null);
  return (
    <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-px">
      {cells.map((url, i) => (
        <div key={i} className="relative overflow-hidden" style={{ backgroundColor: COLLAGE_COLORS[i % COLLAGE_COLORS.length] }}>
          {url && <img src={url} alt="" className="w-full h-full object-cover opacity-90" />}
        </div>
      ))}
    </div>
  );
}
