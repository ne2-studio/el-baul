import React, { useRef, useState } from 'react';
import { useElementHeight } from '@/hooks/useElementHeight';
import { useFileInputSelection } from '@/hooks/useFileInputSelection';
import { Card } from '@/design-system/components/data-display/Card';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { ExpandableFAB, SimpleFAB } from '@/design-system/components/actions/FAB';
import { EditInfoModal } from '@/design-system/patterns/forms/EditInfoModal';
import { NuevaPersonaModal } from '@/features/people/components/NuevaPersonaModal';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PersonasTab } from '@/features/people/components/PersonasTab';
import { RecuerdosTab } from '@/features/memories/components/RecuerdosTab';
import { StickyHeader } from '@/design-system/layouts/StickyHeader';
import { TabButton } from '@/design-system/components/navigation/TabButton';
import { ChevronLeft, Plus, Upload, BookImage, ImageIcon, UserPlus, Sparkles, Bell, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { SelectedPhoto } from '@/features/photos/uploadFlow';
import { CoverPhotoPickerModal } from '@/features/photos/components/CoverPhotoPickerModal';
import { Baul, Chapter, Photo, Recuerdo, Persona } from '@/types';
import { BaulPermissions, getBaulPermissions } from '@/utils/roleUtils';
import { formatDateRange } from '@/app/utils/timeUtils';
import { makeLooseChapterView } from '@/store/baulesCacheReconciliation';
import { Button } from '@/design-system/components/actions/Button';
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
  personas?: Persona[];
  recuerdos?: Recuerdo[];
  baulPermissions?: BaulPermissions;
  currentUserEmail?: string;
  initialTab?: 'capitulos' | 'personas' | 'recuerdos';
  onBack: () => void;
  onSelectChapter: (chapter: Chapter) => void;
  onCreateChapter: () => void;
  onOpenLoosePhotos?: () => void;
  onUploadPhotos?: (selectedPhotos: SelectedPhoto[]) => void;
  /** Se llama cuando alguna foto elegida no se pudo leer (p. ej. el permiso content:// de
   * Android caducó) y por tanto se ha excluido en silencio de la selección. */
  onPhotosDropped?: (count: number) => void;
  onCreatePersona?: (nickname: string) => Promise<boolean>;
  onSelectPersona?: (persona: Persona) => void;
  onCreateRecuerdo?: (text: string) => Promise<boolean>;
  onOpenChat?: () => void;
  onOpenChapterFromRecuerdo?: (chapterId: string) => void;
  onOpenPhotoFromRecuerdo?: (photoId: string, chapterId?: string) => void;
  onUserClick?: (personaId: string) => void;
  onShareRecuerdo?: (recuerdo: Recuerdo) => void;
  onEditRecuerdo?: (recuerdo: Recuerdo, text: string) => Promise<boolean> | boolean | void;
  onRemovalRequests?: () => void;
  pendingRemovalRequestsCount?: number;
  onUpdateBaulInfo?: (name: string, description: string) => Promise<boolean>;
  onRequestBaulDeletion?: () => void;
  onFetchBaulCoverPhotos?: (skip: number, take: number) => Promise<{ photos: Photo[]; hasMore: boolean }>;
  onSetBaulCover?: (photo: Photo) => void;
}

export function ChaptersView({
  baul,
  chapters,
  loosePhotos = [],
  personas = [],
  recuerdos = [],
  baulPermissions = getBaulPermissions(baul),
  currentUserEmail,
  initialTab = 'capitulos',
  onBack,
  onSelectChapter,
  onCreateChapter,
  onOpenLoosePhotos,
  onUploadPhotos,
  onPhotosDropped,
  onCreatePersona,
  onSelectPersona,
  onCreateRecuerdo,
  onOpenChat,
  onOpenChapterFromRecuerdo,
  onOpenPhotoFromRecuerdo,
  onUserClick,
  onShareRecuerdo,
  onEditRecuerdo,
  onRemovalRequests,
  pendingRemovalRequestsCount,
  onUpdateBaulInfo,
  onRequestBaulDeletion,
  onFetchBaulCoverPhotos,
  onSetBaulCover,
}: ChaptersViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showNuevaPersonaModal, setShowNuevaPersonaModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'capitulos' | 'personas' | 'recuerdos'>(initialTab);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [isSavingBaulInfo, setIsSavingBaulInfo] = useState(false);
  const looseChapter = makeLooseChapterView(loosePhotos);

  const handleSaveNuevaPersona = async (nickname: string) => {
    setIsCreatingPersona(true);
    const ok = (await onCreatePersona?.(nickname)) ?? false;
    setIsCreatingPersona(false);
    if (ok) setShowNuevaPersonaModal(false);
  };

  const handleSaveBaulInfo = async (name: string, description: string) => {
    setIsSavingBaulInfo(true);
    const ok = (await onUpdateBaulInfo?.(name, description)) ?? false;
    setIsSavingBaulInfo(false);
    if (ok) setShowEditModal(false);
  };

  const handleFileSelect = useFileInputSelection((photos) => onUploadPhotos?.(photos), onPhotosDropped);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header — back + actions only */}
      <StickyHeader ref={headerRef}>
        <PageContainer className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="plain"
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Volver</span>
            </Button>

            {(onUpdateBaulInfo || (onRemovalRequests && (pendingRemovalRequestsCount ?? 0) > 0) || baulPermissions.canRequestBaulDeletion) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="plain"
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary relative"
                    aria-label="Opciones del baúl"
                  >
                    <MoreVertical className="w-5 h-5" />
                    {(pendingRemovalRequestsCount ?? 0) > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
                      <span className="ml-auto bg-primary text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                        {pendingRemovalRequestsCount}
                      </span>
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
            )}
          </div>
        </PageContainer>
      </StickyHeader>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: '260px' }}>
        {baul.coverPhotoUrl ? (
          <img src={baul.coverPhotoUrl} alt="" className="hero-cover-image absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/30 to-foreground/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 pb-6">
          <PageContainer>
            <h1 className="text-4xl font-serif text-white leading-tight" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
              {baul.name}
            </h1>
            {baul.description && (
              <p className="text-sm text-white/80 mt-1.5 leading-snug max-w-sm">{baul.description}</p>
            )}
            {!baul.description && onUpdateBaulInfo && (
              <p className="text-sm text-white/40 mt-1.5 italic">Sin descripción · edita desde el menú ···</p>
            )}
          </PageContainer>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Tabs — same sticky underline pattern as the Álbum/Capítulo screen (PhotosView.tsx).
          top is the header's measured height, not a hardcoded value — iOS/WKWebView and
          Android/Chrome WebView render the same header markup at slightly different heights. */}
      <div
        className="sticky bg-background/90 backdrop-blur-sm z-[9] border-b border-border"
        style={{ top: headerHeight }}
      >
        <PageContainer className="overflow-x-auto scrollbar-hide">
          <div className="flex w-max md:w-full">
            <TabButton
              label="Capítulos"
              count={chapters.length}
              active={activeTab === 'capitulos'}
              onClick={() => setActiveTab('capitulos')}
            />
            <TabButton
              label="Recuerdos"
              count={recuerdos.length}
              active={activeTab === 'recuerdos'}
              onClick={() => setActiveTab('recuerdos')}
            />
            <TabButton
              label="Personas"
              count={personas.length}
              active={activeTab === 'personas'}
              onClick={() => setActiveTab('personas')}
            />
          </div>
        </PageContainer>
      </div>

      {/* Content */}
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
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3"
                        style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}>
                        {year}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {yearChapters.map((chapter) => (
                          <Card key={chapter.id} onClick={() => onSelectChapter(chapter)} className="!p-0 overflow-hidden">
                            {/* Chapter cover */}
                            <div className="aspect-square bg-secondary flex items-center justify-center">
                              {chapter.coverPhotoUrl ? (
                                <img
                                  src={chapter.coverPhotoUrl}
                                  alt={chapter.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-12 h-12 text-muted-foreground opacity-40" strokeWidth={1.5} />
                              )}
                            </div>

                            {/* Chapter info */}
                            <div className="p-4">
                              <h3 className="font-medium mb-1 text-foreground">{chapter.name}</h3>
                              {chapter.minDate && chapter.maxDate && (
                                <p className="text-[11px] text-primary/80 font-medium mb-0.5">
                                  {formatDateRange(chapter.minDate, chapter.maxDate)}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {chapter.photoCount} {chapter.photoCount === 1 ? 'foto' : 'fotos'}
                                {(chapter.recuerdoCount ?? 0) > 0 && (
                                  <> · {chapter.recuerdoCount} {chapter.recuerdoCount === 1 ? 'recuerdo' : 'recuerdos'}</>
                                )}
                              </p>
                            </div>
                          </Card>
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
                <p
                  className="text-xs text-muted-foreground uppercase tracking-wide mb-3"
                  style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
                >
                  Otras
                </p>
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
          <PersonasTab
            personas={personas}
            currentUserEmail={currentUserEmail}
            onSelectPersona={(persona) => onSelectPersona?.(persona)}
          />
        )}

        {activeTab === 'recuerdos' && (
          <RecuerdosTab
            recuerdos={recuerdos}
            onOpenChapter={onOpenChapterFromRecuerdo}
            onOpenPhoto={onOpenPhotoFromRecuerdo}
            onUserClick={onUserClick}
            onShareRecuerdo={onShareRecuerdo}
            onEditRecuerdo={onEditRecuerdo}
          />
        )}
      </PageContainer>

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
              onClick: () => fileInputRef.current?.click(),
            }] : []),
          ]}
        />
      )}
      {activeTab === 'personas' && (
        <SimpleFAB
          label="Nueva persona"
          icon={<UserPlus className="w-5 h-5" />}
          onClick={() => setShowNuevaPersonaModal(true)}
          hidden={!baulPermissions.canCreatePersona || !onCreatePersona}
        />
      )}
      {activeTab === 'recuerdos' && (
        <SimpleFAB
          label="Ayúdame a recordar"
          icon={<Sparkles className="w-5 h-5" />}
          onClick={() => onOpenChat?.()}
          hidden={!onOpenChat}
        />
      )}

      {showNuevaPersonaModal && (
        <NuevaPersonaModal
          onCancel={() => setShowNuevaPersonaModal(false)}
          onSave={handleSaveNuevaPersona}
          isSubmitting={isCreatingPersona}
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
