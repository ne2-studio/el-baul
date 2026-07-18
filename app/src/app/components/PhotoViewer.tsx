import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { Photo, MoveModal, DateModal } from './PhotosView';
import { Album } from './AlbumsView';
import { formatPartialDate } from '../utils/timeUtils';
import { Button } from './Button';
import { RecuerdoInput } from './RecuerdoInput';
import { RecuerdosList } from './RecuerdosList';
import { Recuerdo } from './RecuerdoCard';
import { PhotoDate } from '@/types';

interface PhotoViewerProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onPhotoChange: (photo: Photo) => void;
  onRequestRemoval?: (photo: Photo, reason: string) => void;
  isCustodio?: boolean;
  canEditAlbum?: boolean;
  onSetBaulCover?: (photo: Photo) => void;
  onSetAlbumCover?: (photo: Photo) => void;
  onMovePhoto?: (photo: Photo, targetAlbumId: string) => void;
  onChangeDate?: (photo: Photo, date: PhotoDate) => void;
  onDeletePhoto?: (photo: Photo, reason: string) => void;
  allAlbums?: Album[];
  currentAlbum?: Album;
  recuerdos?: Recuerdo[];
  onAddRecuerdo?: (photoId: string, text: string) => void;
}

export function PhotoViewer({
  photo,
  photos,
  onClose,
  onPhotoChange,
  onRequestRemoval,
  isCustodio,
  canEditAlbum,
  onSetBaulCover,
  onSetAlbumCover,
  onMovePhoto,
  onChangeDate,
  onDeletePhoto,
  allAlbums = [],
  currentAlbum,
  recuerdos = [],
  onAddRecuerdo
}: PhotoViewerProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalReason, setRemovalReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateYear, setDateYear] = useState('');
  const [dateMonth, setDateMonth] = useState('');
  const [dateDay, setDateDay] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const moveableAlbums = allAlbums.filter(a => a.id !== currentAlbum?.id);

  const currentIndex = photos.findIndex(p => p.id === photo.id);
  const hasRecuerdos = recuerdos.length > 0;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;
  
  const handlePrevious = () => {
    if (hasPrevious) {
      onPhotoChange(photos[currentIndex - 1]);
    }
  };
  
  const handleNext = () => {
    if (hasNext) {
      onPhotoChange(photos[currentIndex + 1]);
    }
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
  };
  
  const handleSubmitRequest = () => {
    if (onRequestRemoval && removalReason.trim()) {
      onRequestRemoval(photo, removalReason);
      setShowRemovalModal(false);
      setRemovalReason('');
      setShowConfirmation(true);
      
      // Auto-close confirmation after 3 seconds
      setTimeout(() => {
        setShowConfirmation(false);
      }, 3000);
    }
  };

  const menuItems: { key: string; label: string; onSelect: () => void }[] = [];
  if (canEditAlbum && onSetAlbumCover) {
    menuItems.push({ key: 'album-cover', label: 'Establecer como portada del álbum', onSelect: () => onSetAlbumCover(photo) });
  }
  if (isCustodio && onSetBaulCover) {
    menuItems.push({ key: 'baul-cover', label: 'Establecer como portada del baúl', onSelect: () => onSetBaulCover(photo) });
  }
  if (onMovePhoto && moveableAlbums.length > 0) {
    menuItems.push({ key: 'move', label: 'Mover a otro álbum', onSelect: () => setShowMoveModal(true) });
  }
  if (onChangeDate) {
    menuItems.push({ key: 'date', label: 'Cambiar fecha', onSelect: () => setShowDateModal(true) });
  }
  if (onRequestRemoval) {
    menuItems.push({ key: 'removal', label: 'Solicitar retirada', onSelect: () => setShowRemovalModal(true) });
  }

  const handleMoveSubmit = () => {
    if (!moveTargetId) return;
    onMovePhoto?.(photo, moveTargetId);
    setShowMoveModal(false);
    setMoveTargetId('');
  };

  const handleDateSubmit = () => {
    const year = parseInt(dateYear);
    if (!year) return;
    onChangeDate?.(photo, {
      year,
      month: dateMonth ? parseInt(dateMonth) : undefined,
      day: dateDay ? parseInt(dateDay) : undefined,
    });
    setShowDateModal(false);
    setDateYear(''); setDateMonth(''); setDateDay('');
  };

  const handleAddRecuerdo = (text: string) => {
    if (onAddRecuerdo) {
      onAddRecuerdo(photo.id, text);
    }
  };
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, photos]);
  
  return (
    <>
      <div 
        className="fixed inset-0 bg-foreground/95 z-50 flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header controls */}
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
          >
            <X className="w-6 h-6 text-background" />
          </button>
          
          {/* Photo counter */}
          <div className="text-background/75 text-sm">
            {currentIndex + 1} / {photos.length}
          </div>
          
          {/* Menu button (only show if there's at least one menu action available) */}
          {menuItems.length > 0 || (isCustodio && onDeletePhoto) ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
              >
                <MoreVertical className="w-6 h-6 text-background" />
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />

                  <div className="absolute top-12 right-0 bg-background rounded-lg shadow-lg py-1 min-w-[200px] z-20">
                    {menuItems.map((item, index) => (
                      <React.Fragment key={item.key}>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            item.onSelect();
                          }}
                          className="w-full px-4 py-3 text-left text-foreground/80 hover:bg-muted transition-colors text-sm"
                        >
                          {item.label}
                        </button>
                        {index < menuItems.length - 1 && (
                          <div className="my-1 border-t border-border/50" />
                        )}
                      </React.Fragment>
                    ))}
                    {isCustodio && onDeletePhoto && (
                      <>
                        {menuItems.length > 0 && (
                          <div className="my-1 border-t border-border/50" />
                        )}
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            setDeleteReason('');
                            setShowDeleteModal(true);
                          }}
                          className="w-full px-4 py-3 text-left text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium"
                        >
                          Retirar foto
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-10" />
          )}
        </div>
        
        {/* Photo with navigation */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {/* Mobile swipe areas */}
          {hasPrevious && (
            <div
              onClick={handlePrevious}
              className="absolute left-0 top-0 bottom-0 w-1/4 z-10 md:hidden cursor-pointer"
              aria-label="Foto anterior"
            />
          )}

          {hasNext && (
            <div
              onClick={handleNext}
              className="absolute right-0 top-0 bottom-0 w-1/4 z-10 md:hidden cursor-pointer"
              aria-label="Foto siguiente"
            />
          )}

          {/* Previous button - Desktop */}
          {hasPrevious && (
            <button
              onClick={handlePrevious}
              className="absolute left-4 w-12 h-12 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors z-10 hidden md:flex"
            >
              <ChevronLeft className="w-6 h-6 text-background" />
            </button>
          )}

          {/* Photo */}
          <img
            src={photo.fullUrl}
            alt={photo.caption || 'Foto'}
            className="w-full h-full object-contain select-none"
            draggable={false}
          />

          {/* Next button - Desktop */}
          {hasNext && (
            <button
              onClick={handleNext}
              className="absolute right-4 w-12 h-12 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors z-10 hidden md:flex"
            >
              <ChevronRight className="w-6 h-6 text-background" />
            </button>
          )}
        </div>

        {/* Info & Recuerdos section */}
        <div className="px-6 py-8 space-y-8 max-h-[50vh] overflow-y-auto">
          {/* Date */}
          {(photo.date || onChangeDate) && (
            <button
              onClick={() => onChangeDate && setShowDateModal(true)}
              disabled={!onChangeDate}
              className="text-xs text-background/60 hover:text-background/80 transition-colors disabled:hover:text-background/60"
            >
              {photo.date ? formatPartialDate(photo.date) : 'Sin fecha · Toca para añadir'}
            </button>
          )}

          {/* Recuerdos List & Input */}
          <div className="space-y-6">
            {!hasRecuerdos ? (
              <div className="text-center">
                <p className="text-background/50 text-sm mb-2">
                  Sé el primero en añadir un recuerdo
                </p>
              </div>
            ) : (
              <RecuerdosList recuerdos={recuerdos} />
            )}

            {onAddRecuerdo && (
              <div className="pt-2">
                <RecuerdoInput
                  photoId={photo.id}
                  onSubmit={handleAddRecuerdo}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Removal request modal */}
      {showRemovalModal && (
        <div className="fixed inset-0 bg-foreground/50 z-[60] flex items-end md:items-center justify-center p-4">
          <div 
            className="absolute inset-0" 
            onClick={() => {
              setShowRemovalModal(false);
              setRemovalReason('');
            }}
          />
          
          <div className="bg-background rounded-t-2xl md:rounded-2xl max-w-md w-full p-6 relative z-10 animate-slide-up">
            <h2 className="font-serif text-xl text-foreground mb-2">
              Solicitar retirada de esta foto
            </h2>
            
            <p className="text-muted-foreground text-sm mb-4">
              El custodio del baúl revisará tu solicitud.
            </p>
            
            <textarea
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="Cuéntanos por qué no quieres que esta foto aparezca en este baúl"
              className="w-full min-h-[120px] p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground mb-6"
              autoFocus
            />
            
            <div className="flex flex-col-reverse md:flex-row gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowRemovalModal(false);
                  setRemovalReason('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleSubmitRequest}
                disabled={!removalReason.trim()}
              >
                Enviar solicitud
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation toast */}
      {showConfirmation && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[70] animate-slide-down">
          <div className="bg-background border border-border rounded-lg shadow-lg p-4">
            <p className="text-foreground text-sm">
              Tu solicitud ha sido enviada al custodio del baúl.
            </p>
          </div>
        </div>
      )}

      {/* Mover a otro álbum modal */}
      {showMoveModal && (
        <MoveModal
          title="Mover a otro álbum"
          albums={moveableAlbums}
          selectedId={moveTargetId}
          onSelect={setMoveTargetId}
          onCancel={() => setShowMoveModal(false)}
          onConfirm={handleMoveSubmit}
        />
      )}

      {/* Cambiar fecha modal */}
      {showDateModal && (
        <DateModal
          title="Cambiar fecha de la foto"
          year={dateYear} month={dateMonth} day={dateDay}
          onYearChange={setDateYear} onMonthChange={setDateMonth} onDayChange={setDateDay}
          onCancel={() => setShowDateModal(false)}
          onConfirm={handleDateSubmit}
        />
      )}

      {/* Retirar foto modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-foreground/60 z-[60] flex items-end md:items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowDeleteModal(false)} />
          <div className="bg-background rounded-t-2xl md:rounded-2xl max-w-md w-full p-6 relative z-10 animate-slide-up">
            <h2 className="font-serif text-xl text-foreground mb-1">
              Retirar esta foto
            </h2>

            <div className="bg-destructive/8 border border-destructive/20 rounded-xl p-3 mb-4 mt-3">
              <p className="text-xs text-destructive/80 leading-relaxed">
                <span className="font-semibold">Atención:</span> Esta foto dejará de estar disponible para todos los miembros del baúl. Todos los recuerdos asociados a ella se perderán de forma permanente.
              </p>
            </div>

            <label className="block text-sm font-medium text-foreground mb-2">
              Motivo de la retirada
            </label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="¿Por qué se retira esta foto?"
              rows={3}
              className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-destructive/40 placeholder:text-muted-foreground mb-5"
              autoFocus
            />

            <div className="flex flex-col-reverse md:flex-row gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </Button>
              <button
                onClick={() => {
                  if (!deleteReason.trim()) return;
                  setShowDeleteModal(false);
                  onDeletePhoto?.(photo, deleteReason.trim());
                }}
                disabled={!deleteReason.trim()}
                className="flex-1 py-3 rounded-xl bg-destructive text-white text-sm font-medium disabled:opacity-40 hover:bg-destructive/90 transition-colors"
              >
                Sí, retirar foto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}