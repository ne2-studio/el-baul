import React, { useState } from 'react';
import { X, MoreVertical } from 'lucide-react';

export interface PhotoViewerMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  variant?: 'default' | 'destructive';
}

interface PhotoViewerHeaderProps {
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  menuItems: PhotoViewerMenuItem[];
}

// Barra superior del visor: cerrar, contador de fotos, y menú de acciones (mover, retirar, etc.)
export function PhotoViewerHeader({ currentIndex, totalCount, onClose, menuItems }: PhotoViewerHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex items-center justify-between p-4">
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
      >
        <X className="w-6 h-6 text-background" />
      </button>

      <div className="text-background/75 text-sm">
        {currentIndex + 1} / {totalCount}
      </div>

      {menuItems.length > 0 ? (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Más opciones"
            className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
          >
            <MoreVertical className="w-6 h-6 text-background" />
          </button>

          {showMenu && (
            <>
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
                      className={
                        item.variant === 'destructive'
                          ? 'w-full px-4 py-3 text-left text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium'
                          : 'w-full px-4 py-3 text-left text-foreground/80 hover:bg-muted transition-colors text-sm'
                      }
                    >
                      {item.label}
                    </button>
                    {index < menuItems.length - 1 && (
                      <div className="my-1 border-t border-border/50" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="w-10" />
      )}
    </div>
  );
}
