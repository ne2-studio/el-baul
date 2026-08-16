import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';
import { cn } from '@/design-system/components/ui/utils';
import { NewDot } from '@/design-system/components/data-display/Badges';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useCurrentBaulStore } from '@/store/useCurrentBaulStore';
import { hasUnseenBaulActivity, useUIStore } from '@/store/uiStore';

interface WorkspaceSwitcherContainerProps {
  activeBaul: Baul;
}

// Sustituye el título estático de BaulRoute — es el selector de workspace del PRD. Self-
// sufficient (ver la regla de containers/ en docs/architecture/frontend.md): lee su propia
// lista de baúles y hace el propio cambio de CurrentBaul + navegación, igual que
// BaulSettingsMenuContainer hace con sus propias acciones. Las filas del dropdown son
// deliberadamente discretas (miniatura + nombre + capítulos), no la BaulCard grande de la Home
// que existía antes — mismo lenguaje visual/compacto que ya usa ShareTargetBaulScreen para
// elegir baúl al compartir fotos.
export function WorkspaceSwitcherContainer({ activeBaul }: WorkspaceSwitcherContainerProps) {
  const navigate = useNavigate();
  const baules = useBaulesStore((state) => state.baules);
  const baulActivitySeenAt = useUIStore((state) => state.baulActivitySeenAt);
  // El propio activeBaul se marca como visto por useBaulScope en cuanto se resuelve (ver ese
  // hook), así que en la práctica solo aporta al agregado del trigger justo tras cambiar de
  // baúl, antes de que ese efecto corra — no hace falta excluirlo aquí a mano.
  const hasAnyUnseenActivity = baules.some((baul) => hasUnseenBaulActivity(baul, baulActivitySeenAt));

  const handleSwitch = (baul: Baul) => {
    if (baul.id === activeBaul.id) return;
    useCurrentBaulStore.getState().setCurrentBaulId(baul.id);
    navigate(`/baules/${baul.id}`);
  };

  const handleCreateBaul = () => {
    navigate('/baules/nuevo');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="plain"
          className="flex items-center gap-1 -ml-2 px-2 py-1.5 rounded-lg hover:bg-primary/5 max-w-[65vw]"
          aria-label="Cambiar de baúl"
        >
          <span className="text-xl font-serif text-foreground truncate">{activeBaul.name}</span>
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
          {hasAnyUnseenActivity && <NewDot className="shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        {baules.map((baul) => {
          const isActive = baul.id === activeBaul.id;
          return (
            <DropdownMenuItem
              key={baul.id}
              onSelect={() => handleSwitch(baul)}
              className={cn('group gap-3 py-2.5 px-2 rounded-xl', isActive && 'bg-primary/10')}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0">
                {baul.coverPhotoUrl ? (
                  <img src={baul.coverPhotoUrl} alt={baul.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BaulIcon className="w-4 h-4 text-muted-foreground opacity-40" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-foreground group-focus:text-accent-foreground text-sm leading-tight truncate">
                  {baul.name}
                </p>
                <p className="text-muted-foreground group-focus:text-accent-foreground text-xs mt-0.5">
                  {baul.chapterCount} {baul.chapterCount === 1 ? 'capítulo' : 'capítulos'}
                </p>
              </div>
              {hasUnseenBaulActivity(baul, baulActivitySeenAt) && <NewDot className="shrink-0" />}
              {isActive && <Check className="w-4 h-4 text-primary shrink-0" aria-label="Baúl activo" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCreateBaul} className="gap-3 py-2.5 px-2 rounded-xl">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          Crear nuevo baúl
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
