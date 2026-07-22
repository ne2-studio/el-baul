import React, { useRef, useState } from 'react';
import { useElementHeight } from '@/hooks/useElementHeight';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { ExpandableFAB, SimpleFAB } from './FAB';
import { EditInfoModal } from './EditInfoModal';
import { NuevaPersonaModal } from './NuevaPersonaModal';
import { PersonasTab } from './PersonasTab';
import { TabButton } from './TabButton';
import { ChevronLeft, Plus, Upload, BookImage, ImageIcon, UserPlus, Bell, MoreVertical, Pencil } from 'lucide-react';
import { Baul } from './BaulesList';
import { SelectedPhoto, materializeSelectedPhoto } from './UploadConfirmationScreen';
import { PhotoDate, SharedUser } from '@/types';
import { formatDateRange } from '../utils/timeUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export interface Album {
  id: string;
  name: string;
  description?: string;
  photoCount: number;
  coverPhotoUrl?: string;
  featuredCoverPhotoUrl?: string;
  lastUpdated?: string;
  recuerdoCount?: number;
  latestRecuerdoText?: string;
  latestRecuerdoAuthor?: string;
  minDate?: PhotoDate;
  maxDate?: PhotoDate;
  undatedPhotoCount?: number;
}

interface LoosePhoto {
  id: string;
  thumbnailUrl: string;
}

interface AlbumsViewProps {
  baul: Baul;
  albums: Album[];
  loosePhotos?: LoosePhoto[];
  sharedUsers?: SharedUser[];
  isAdmin?: boolean;
  currentUserEmail?: string;
  onBack: () => void;
  onSelectAlbum: (album: Album) => void;
  onCreateAlbum: () => void;
  onOpenLoosePhotos?: () => void;
  onUploadPhotos?: (selectedPhotos: SelectedPhoto[]) => void;
  /** Se llama cuando alguna foto elegida no se pudo leer (p. ej. el permiso content:// de
   * Android caducó) y por tanto se ha excluido en silencio de la selección. */
  onPhotosDropped?: (count: number) => void;
  onCreatePersona?: (nickname: string) => Promise<boolean>;
  onSelectPersona?: (persona: SharedUser) => void;
  onRemovalRequests?: () => void;
  pendingRemovalRequestsCount?: number;
  onUpdateBaulInfo?: (name: string, description: string) => Promise<boolean>;
}

export function AlbumsView({
  baul,
  albums,
  loosePhotos = [],
  sharedUsers = [],
  isAdmin = false,
  currentUserEmail,
  onBack,
  onSelectAlbum,
  onCreateAlbum,
  onOpenLoosePhotos,
  onUploadPhotos,
  onPhotosDropped,
  onCreatePersona,
  onSelectPersona,
  onRemovalRequests,
  pendingRemovalRequestsCount,
  onUpdateBaulInfo,
}: AlbumsViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNuevaPersonaModal, setShowNuevaPersonaModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'capitulos' | 'personas'>('capitulos');
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [isSavingBaulInfo, setIsSavingBaulInfo] = useState(false);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = ''; // must run after snapshotting — files is a live FileList tied to the input

    const materialized = await Promise.all(fileArray.map(materializeSelectedPhoto));
    const selectedPhotos = materialized.filter((photo): photo is SelectedPhoto => photo !== null);
    if (materialized.length > selectedPhotos.length) {
      onPhotosDropped?.(materialized.length - selectedPhotos.length);
    }
    if (selectedPhotos.length === 0) return;

    onUploadPhotos?.(selectedPhotos);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header — back + actions only */}
      <div ref={headerRef} className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Volver</span>
            </button>

            {(onUpdateBaulInfo || (onRemovalRequests && (pendingRemovalRequestsCount ?? 0) > 0)) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary relative"
                    aria-label="Opciones del baúl"
                  >
                    <MoreVertical className="w-5 h-5" />
                    {(pendingRemovalRequestsCount ?? 0) > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: '260px' }}>
        {baul.coverPhotoUrl ? (
          <img src={baul.coverPhotoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/30 to-foreground/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 pb-6">
          <div className="max-w-2xl mx-auto px-6">
            <h1 className="text-4xl font-serif text-white leading-tight" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
              {baul.name}
            </h1>
            {baul.description && (
              <p className="text-sm text-white/80 mt-1.5 leading-snug max-w-sm">{baul.description}</p>
            )}
            {!baul.description && onUpdateBaulInfo && (
              <p className="text-sm text-white/40 mt-1.5 italic">Sin descripción · edita desde el menú ···</p>
            )}
          </div>
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
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex">
            <TabButton
              label="Capítulos"
              count={albums.length}
              active={activeTab === 'capitulos'}
              onClick={() => setActiveTab('capitulos')}
            />
            <TabButton
              label="Personas"
              count={sharedUsers.length}
              active={activeTab === 'personas'}
              onClick={() => setActiveTab('personas')}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6 pb-28">
        {activeTab === 'capitulos' && (
        albums.length === 0 && loosePhotos.length === 0 ? (
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
            {albums.length > 0 && (() => {
              const groups = new Map<string, Album[]>();
              for (const album of albums) {
                const year = album.minDate ? String(album.minDate.year) : 'Sin año';
                if (!groups.has(year)) groups.set(year, []);
                groups.get(year)!.push(album);
              }

              return (
                <div className="space-y-6">
                  {Array.from(groups.entries()).map(([year, yearAlbums]) => (
                    <div key={year}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3"
                        style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}>
                        {year}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {yearAlbums.map((album) => (
                          <Card key={album.id} onClick={() => onSelectAlbum(album)} className="!p-0 overflow-hidden">
                            {/* Album cover */}
                            <div className="aspect-square bg-secondary flex items-center justify-center">
                              {album.coverPhotoUrl ? (
                                <img
                                  src={album.coverPhotoUrl}
                                  alt={album.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-12 h-12 text-muted-foreground opacity-40" strokeWidth={1.5} />
                              )}
                            </div>

                            {/* Album info */}
                            <div className="p-4">
                              <h3 className="font-medium mb-1 text-foreground">{album.name}</h3>
                              {album.minDate && album.maxDate && (
                                <p className="text-[11px] text-primary/80 font-medium mb-0.5">
                                  {formatDateRange(album.minDate, album.maxDate)}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {album.photoCount} {album.photoCount === 1 ? 'foto' : 'fotos'}
                                {(album.recuerdoCount ?? 0) > 0 && (
                                  <> · {album.recuerdoCount} {album.recuerdoCount === 1 ? 'recuerdo' : 'recuerdos'}</>
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
            {loosePhotos.length > 0 && (
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
                    <FotosSueltasCollage coverPhotos={loosePhotos.slice(0, 9).map((p) => p.thumbnailUrl)} />
                  </div>
                  <div className="p-4 bg-card">
                    <h3 className="font-medium text-lg text-foreground">Fotos sueltas</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {loosePhotos.length} {loosePhotos.length === 1 ? 'foto que aún no pertenece' : 'fotos que aún no pertenecen'} a ningún capítulo
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
            sharedUsers={sharedUsers}
            currentUserEmail={currentUserEmail}
            onSelectPersona={(persona) => onSelectPersona?.(persona)}
          />
        )}
      </div>

      {activeTab === 'capitulos' ? (
        <ExpandableFAB
          actions={[
            {
              label: 'Nuevo capítulo',
              icon: <Plus className="w-4 h-4" />,
              onClick: onCreateAlbum,
            },
            ...(onUploadPhotos ? [{
              label: 'Subir fotos',
              icon: <Upload className="w-4 h-4" />,
              onClick: () => fileInputRef.current?.click(),
            }] : []),
          ]}
        />
      ) : (
        <SimpleFAB
          label="Nueva persona"
          icon={<UserPlus className="w-5 h-5" />}
          onClick={() => setShowNuevaPersonaModal(true)}
          hidden={!isAdmin || !onCreatePersona}
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
    </div>
  );
}

// Collage for the "Fotos sueltas" virtual album cover
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
