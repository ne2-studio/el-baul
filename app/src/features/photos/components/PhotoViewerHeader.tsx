import React, { useState } from 'react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Button } from '@/design-system/components/actions/Button';
import { IconButton } from '@/design-system/components/actions/IconButton';

export interface PhotoViewerMenuItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
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
      <IconButton
        onClick={onClose}
        aria-label="Cerrar"
        tone="inverse"
        className="pointer-events-auto"
      >
        <Icon icon={icons.close} size="lg" className="text-background" aria-hidden />
      </IconButton>

      <div className="text-background/75 text-sm pointer-events-auto">
        {currentIndex + 1} / {totalCount}
      </div>

      {menuItems.length > 0 ? (
        <div className="relative pointer-events-auto">
          <IconButton
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Más opciones"
            tone="inverse"
          >
            <Icon icon={icons.moreOptions} size="lg" className="text-background" aria-hidden />
          </IconButton>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />

              <div className="absolute top-12 right-0 bg-background rounded-lg shadow-lg py-1 min-w-[200px] z-20">
                {menuItems.map((item, index) => (
                  <React.Fragment key={item.key}>
                    <Button variant="plain"
                      disabled={item.disabled}
                      onClick={() => {
                        setShowMenu(false);
                        item.onSelect();
                      }}
                      className={
                        item.variant === 'destructive'
                          ? 'w-full flex items-center gap-2 px-4 py-3 text-left text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium'
                          : 'w-full flex items-center gap-2 px-4 py-3 text-left text-foreground/80 hover:bg-muted transition-colors text-sm'
                      }
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </Button>
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
