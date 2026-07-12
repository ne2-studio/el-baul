import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { ChevronLeft, Plus, BookImage, ImageIcon, Share2, Users, Bell, MoreVertical } from 'lucide-react';
import { Baul } from './BaulesList';
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
}

interface AlbumsViewProps {
  baul: Baul;
  albums: Album[];
  onBack: () => void;
  onSelectAlbum: (album: Album) => void;
  onCreateAlbum: () => void;
  onShareBaul?: () => void;
  onManagePeople?: () => void;
  onAccessRequests?: () => void;
  pendingRequestsCount?: number;
  onRemovalRequests?: () => void;
  pendingRemovalRequestsCount?: number;
  onOpenActivity?: () => void;
  actionableActivityCount?: number;
}

export function AlbumsView({ baul, albums, onBack, onSelectAlbum, onCreateAlbum, onShareBaul, onManagePeople, onAccessRequests, pendingRequestsCount, onRemovalRequests, pendingRemovalRequestsCount, onOpenActivity, actionableActivityCount }: AlbumsViewProps) {
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
              {/* Activity icon */}
              {onOpenActivity && (
                <button
                  onClick={onOpenActivity}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary relative"
                  aria-label="Ver actividad"
                >
                  <Bell className="w-5 h-5" />
                  {actionableActivityCount && actionableActivityCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </button>
              )}
              
              {/* Three dots menu */}
              {(onShareBaul || onManagePeople || (onAccessRequests && pendingRequestsCount && pendingRequestsCount > 0) || (onRemovalRequests && pendingRemovalRequestsCount && pendingRemovalRequestsCount > 0)) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary relative"
                      aria-label="Opciones del baúl"
                    >
                      <MoreVertical className="w-5 h-5" />
                      {/* Badge indicator if there are pending requests */}
                      {((pendingRequestsCount && pendingRequestsCount > 0) || (pendingRemovalRequestsCount && pendingRemovalRequestsCount > 0)) && (
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
                    {onAccessRequests && pendingRequestsCount && pendingRequestsCount > 0 && (
                      <DropdownMenuItem onClick={onAccessRequests}>
                        <Bell className="w-4 h-4 mr-2" />
                        <span>Solicitudes de acceso</span>
                        <span className="ml-auto bg-primary text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                          {pendingRequestsCount}
                        </span>
                      </DropdownMenuItem>
                    )}
                    {onRemovalRequests && pendingRemovalRequestsCount && pendingRemovalRequestsCount > 0 && (
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
          <h1 className="text-3xl text-foreground">{baul.name}</h1>
          {baul.description && (
            <p className="text-sm text-muted-foreground mt-1">{baul.description}</p>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {albums.length === 0 ? (
          <EmptyState
            icon={<BookImage className="w-20 h-20" strokeWidth={1.5} />}
            title="Este baúl está vacío"
            subtitle="Crea tu primer álbum para empezar a guardar recuerdos"
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {albums.map((album) => (
              <Card key={album.id} onClick={() => onSelectAlbum(album)} className="p-0 overflow-hidden">
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
                  <p className="text-sm text-muted-foreground">
                    {album.photoCount} {album.photoCount === 1 ? 'foto' : 'fotos'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
        
        {/* Create button */}
        <div className="mt-6">
          <Button 
            variant="primary" 
            fullWidth 
            onClick={onCreateAlbum}
            className="flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo álbum
          </Button>
        </div>
      </div>
    </div>
  );
}