import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, MoreVertical } from 'lucide-react';
import { IconButton } from '@/design-system/components/actions/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';
import { useAppConfigStore } from '@/store/useAppConfigStore';

interface ChatMenuContainerProps {
  baulId: string;
}

// Menú "···" de la ventana de chat. Hoy solo contiene "Gestionar memoria", así que cuando la
// feature flag está desactivada no renderiza nada — ni siquiera el botón "···" — en vez de un
// menú con un único ítem inalcanzable. Se navega con solo baulId, así que puede hacerlo por sí
// mismo (ver docs/architecture/frontend.md, containers/ "navegación ID-only").
export function ChatMenuContainer({ baulId }: ChatMenuContainerProps) {
  const navigate = useNavigate();
  const chatMemoryEnabled = useAppConfigStore((state) => state.chatMemoryEnabled);

  if (!chatMemoryEnabled) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label="Opciones del chat">
          <MoreVertical className="w-5 h-5" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => navigate(`/baules/${baulId}/recordar/memoria`)}>
          <Brain className="w-4 h-4 mr-2" />
          Gestionar memoria
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
