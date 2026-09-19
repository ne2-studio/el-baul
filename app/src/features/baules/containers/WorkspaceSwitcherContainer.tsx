import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Images, Plus, Smartphone } from 'lucide-react';
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

type PersonalKey = 'mis-fotos' | 'en-este-dispositivo';

interface PersonalEntry {
  key: PersonalKey;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

// The PERSONAL section's own small, static list — same shape as "Mis baúles" below it now that
// there are two entries (see this file's own doc comment for why one entry stayed a single
// static item instead of a list). "Mis fotos" is the user's own El Baúl-hosted photos;
// "En este dispositivo" is a read-only projection of the Android photo library that doesn't
// belong to El Baúl at all yet — see EnEsteDispositivoRoute's boundary note.
const PERSONAL_ENTRIES: PersonalEntry[] = [
  { key: 'mis-fotos', label: 'Mis fotos', path: '/mis-fotos', icon: Images },
  { key: 'en-este-dispositivo', label: 'En este dispositivo', path: '/en-este-dispositivo', icon: Smartphone },
];

interface WorkspaceSwitcherContainerProps {
  // null = we're on a user-scoped screen that isn't any baúl (currently "Mis fotos" and "En
  // este dispositivo") — see docs/.backlog issue #62. The switcher still renders every baúl
  // either way; null just means none of them is "the current one".
  activeBaul: Baul | null;
  /** Which PERSONAL entry is active — only meaningful (and only read) while activeBaul is
   * null. Defaults to 'mis-fotos' so BaulRoute's existing activeBaul={baul} call site (where
   * this prop never applies) doesn't need touching. */
  activePersonalKey?: PersonalKey;
}

// Sustituye el título estático de BaulRoute — es el selector de workspace del PRD. Self-
// sufficient (ver la regla de containers/ en docs/architecture/frontend.md): lee su propia
// lista de baúles y hace el propio cambio de CurrentBaul + navegación, igual que
// BaulSettingsMenuContainer hace con sus propias acciones. Las filas del dropdown son
// deliberadamente discretas (miniatura + nombre + capítulos), no la BaulCard grande de la Home
// que existía antes — mismo lenguaje visual/compacto que ya usa ShareTargetBaulScreen para
// elegir baúl al compartir fotos.
//
// Ya no es solo un "BaulSwitcher": con "Mis fotos" (docs/.backlog issue #62, primer contexto
// de aplicación que no es un baúl) pasa a ser el selector entre espacios/contextos en general
// — de ahí el nombre genérico que ya tenía. La sección PERSONAL creció de un único item estático
// a la misma lista mapeada que "Mis baúles" el día que llegó una segunda entrada
// ("En este dispositivo" — ver PERSONAL_ENTRIES).
export function WorkspaceSwitcherContainer({ activeBaul, activePersonalKey = 'mis-fotos' }: WorkspaceSwitcherContainerProps) {
  const navigate = useNavigate();
  const baules = useBaulesStore((state) => state.baules);
  // Server-authoritative y por usuario: GET /api/baules calcula baul.hasUnseenActivity contra el
  // BaulFeedCursor de esta persona (ver BaulesController.GetAll), así que el dot es coherente
  // entre dispositivos. El propio activeBaul se marca como visto en el servidor al entrar (ver
  // useBaulScope / BaulScopeAggregator); su hasUnseenActivity aquí puede ir un instante por
  // detrás hasta el siguiente GET /api/baules, sin efecto práctico.
  const hasAnyUnseenActivity = baules.some((baul) => baul.hasUnseenActivity);

  const handleSwitch = (baul: Baul) => {
    if (baul.id === activeBaul?.id) return;
    useCurrentBaulStore.getState().setCurrentBaulId(baul.id);
    navigate(`/baules/${baul.id}`);
  };

  const handleSelectPersonal = (entry: PersonalEntry) => {
    if (activeBaul === null && activePersonalKey === entry.key) return;
    navigate(entry.path);
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
          aria-label="Cambiar de espacio"
        >
          <span className="text-xl font-serif text-foreground truncate">
            {activeBaul ? activeBaul.name : PERSONAL_ENTRIES.find((e) => e.key === activePersonalKey)!.label}
          </span>
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
          {activeBaul && hasAnyUnseenActivity && <NewDot className="shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <p className="px-2 pt-1 pb-1.5 text-[0.6875rem] font-medium tracking-wide uppercase text-muted-foreground">
          Personal
        </p>
        {PERSONAL_ENTRIES.map((entry) => {
          const isActive = activeBaul === null && activePersonalKey === entry.key;
          const Icon = entry.icon;
          return (
            <DropdownMenuItem
              key={entry.key}
              onSelect={() => handleSelectPersonal(entry)}
              className={cn('group gap-3 py-2.5 px-2 rounded-xl', isActive && 'bg-primary/10')}
            >
              <div className="w-10 h-10 rounded-lg bg-secondary shrink-0 flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="font-serif text-foreground group-focus:text-accent-foreground text-sm leading-tight flex-1">
                {entry.label}
              </p>
              {isActive && <Check className="w-4 h-4 text-primary shrink-0" aria-label="Espacio activo" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <p className="px-2 pt-1 pb-1.5 text-[0.6875rem] font-medium tracking-wide uppercase text-muted-foreground">
          Mis baúles
        </p>
        {baules.map((baul) => {
          const isActive = baul.id === activeBaul?.id;
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
              {baul.hasUnseenActivity && <NewDot className="shrink-0" />}
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
