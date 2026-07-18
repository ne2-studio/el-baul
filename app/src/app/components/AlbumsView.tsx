import React, { useRef } from 'react';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { ExpandableFAB } from './FAB';
import { InlineEdit } from './InlineEdit';
import { ChevronLeft, Plus, Upload, BookImage, ImageIcon, Share2, Users, Bell, MoreVertical } from 'lucide-react';
import { Baul } from './BaulesList';
import { SelectedPhoto } from './UploadConfirmationScreen';
import { PhotoDate } from '@/types';
import { formatDateRange } from '../utils/timeUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  onBack: () => void;
  onSelectAlbum: (album: Album) => void;
  onCreateAlbum: () => void;
  onOpenLoosePhotos?: () => void;
  onUploadPhotos?: (selectedPhotos: SelectedPhoto[]) => void;
  onShareBaul?: () => void;
  onManagePeople?: () => void;
  onRemovalRequests?: () => void;
  pendingRemovalRequestsCount?: number;
  onRenameBaul?: (name: string) => void;
  onUpdateBaulDescription?: (description: string) => void;
}

export function AlbumsView({ baul, albums, loosePhotos = [], onBack, onSelectAlbum, onCreateAlbum, onOpenLoosePhotos, onUploadPhotos, onShareBaul, onManagePeople, onRemovalRequests, pendingRemovalRequestsCount, onRenameBaul, onUpdateBaulDescription }: AlbumsViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedPhotos: SelectedPhoto[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file)
    }));

    e.target.value = '';
    onUploadPhotos?.(selectedPhotos);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <div className="flex items-start justify-between mb-3">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Volver</span>
            </button>
            
            <div className="flex items-center gap-2">
              {/* Three dots menu */}
              {(onShareBaul || onManagePeople || (onRemovalRequests && (pendingRemovalRequestsCount ?? 0) > 0)) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary relative"
                      aria-label="Opciones del baúl"
                    >
                      <MoreVertical className="w-5 h-5" />
                      {/* Badge indicator if there are pending requests */}
                      {(pendingRemovalRequestsCount ?? 0) > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {onShareBaul && (
                      <DropdownMenuItem onClick={onShareBaul}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartir baúl
                      </DropdownMenuItem>
                    )}
                    {onManagePeople && (
                      <DropdownMenuItem onClick={onManagePeople}>
                        <Users className="w-4 h-4 mr-2" />
                        Ver personas con acceso
                      </DropdownMenuItem>
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
          <InlineEdit
            value={baul.name}
            onSave={name => onRenameBaul?.(name)}
            placeholder="Nombre del baúl"
            className="text-3xl text-foreground leading-tight"
            disabled={!onRenameBaul}
          />
          <InlineEdit
            value={baul.description ?? ''}
            onSave={description => onUpdateBaulDescription?.(description)}
            placeholder="Añadir descripción…"
            className="text-sm text-muted-foreground"
            multiline
            disabled={!onUpdateBaulDescription}
          />
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

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6 pb-28">
        {albums.length === 0 && loosePhotos.length === 0 ? (
          <EmptyState
            icon={<BookImage className="w-20 h-20" strokeWidth={1.5} />}
            title="Este baúl está vacío"
            subtitle="Crea tu primer álbum para empezar a guardar recuerdos"
          />
        ) : (
          <div className="space-y-6">
            {/* Álbum destacado, a ancho completo */}
            {albums.length > 0 && (() => {
              const album = albums[0];
              const recuerdoCount = album.recuerdoCount || 0;
              const metadata = recuerdoCount > 0
                ? `${album.photoCount} ${album.photoCount === 1 ? 'foto' : 'fotos'} · ${recuerdoCount} ${recuerdoCount === 1 ? 'recuerdo' : 'recuerdos'}`
                : `${album.photoCount} ${album.photoCount === 1 ? 'foto' : 'fotos'}`;

              return (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3"
                    style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}>
                    Álbum destacado
                  </p>
                  <Card key={album.id} onClick={() => onSelectAlbum(album)} className="!p-0 overflow-hidden">
                    {/* Album cover */}
                    <div className="aspect-[16/10] bg-secondary flex items-center justify-center">
                      {album.featuredCoverPhotoUrl ? (
                        <img
                          src={album.featuredCoverPhotoUrl}
                          alt={album.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-16 h-16 text-muted-foreground opacity-40" strokeWidth={1.5} />
                      )}
                    </div>

                    {/* Album info */}
                    <div className="p-4">
                      <h3 className="font-medium text-lg text-foreground">{album.name}</h3>
                      {album.minDate && album.maxDate && (
                        <p className="text-xs text-primary/80 font-medium mt-1">
                          {formatDateRange(album.minDate, album.maxDate)}
                        </p>
                      )}
                      {album.latestRecuerdoText && album.latestRecuerdoAuthor && (
                        <p className="text-sm text-foreground/70 italic mt-2 line-clamp-1">
                          "{album.latestRecuerdoText.slice(0, 60)}…" — {album.latestRecuerdoAuthor}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{metadata}</p>
                      {album.lastUpdated && (
                        <p className="text-xs text-muted-foreground/60 mt-1.5">
                          Actualizado {album.lastUpdated}
                        </p>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })()}

            {/* Resto de álbumes, agrupados por año de la fecha mínima (ya vienen
                ordenados del backend por fecha mínima descendente, así que agrupar
                consecutivamente preserva ese orden dentro y entre swimlanes) */}
            {albums.length > 1 && (() => {
              const rest = albums.slice(1);
              const groups = new Map<string, Album[]>();
              for (const album of rest) {
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

            {/* Fotos sueltas — álbum virtual */}
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
                      {loosePhotos.length} {loosePhotos.length === 1 ? 'foto que aún no pertenece' : 'fotos que aún no pertenecen'} a ningún álbum
                    </p>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      <ExpandableFAB
        actions={[
          {
            label: 'Nuevo álbum',
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