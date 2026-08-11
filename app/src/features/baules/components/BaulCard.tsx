import React from 'react';
import { Users, Clock } from 'lucide-react';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { Button } from '@/design-system/components/actions/Button';
import { RoleBadge } from '@/design-system/components/data-display/Badges';
import { Baul } from '@/types';
import { getBaulPermissions } from '@/utils/roleUtils';

interface BaulCardProps {
  baul: Baul;
  onClick: () => void;
}

export function BaulCard({ baul, onClick }: BaulCardProps) {
  const permissions = getBaulPermissions(baul);

  return (
    <Button variant="plain"
      onClick={onClick}
      className="relative w-full h-52 rounded-2xl overflow-hidden text-left shadow-sm active:scale-[0.98] transition-transform"
    >
      {/* Background photo */}
      <div className="absolute inset-0 bg-secondary">
        {baul.coverPhotoUrl ? (
          <img src={baul.coverPhotoUrl} alt={baul.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BaulIcon className="w-16 h-16 text-muted-foreground opacity-40" />
          </div>
        )}
      </div>

      {/* Gradient overlay — solid enough for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/20 to-black/75" />

      {/* Top-left: title + description + chapter count */}
      <div className="absolute top-4 left-4 right-16">
        <h3 className="font-serif text-white text-xl leading-tight mb-0.5 drop-shadow">
          {baul.name}
        </h3>
        {baul.description && (
          <p className="text-white/90 text-xs leading-snug line-clamp-1 drop-shadow-sm">{baul.description}</p>
        )}
        <p className="text-white/80 text-xs mt-1">
          {baul.chapterCount} {baul.chapterCount === 1 ? 'capítulo' : 'capítulos'}
        </p>
      </div>

      {/* Bottom-left: role badge */}
      <div className="absolute bottom-4 left-4">
        <RoleBadge
          role={baul.role ?? 'colaborador'}
          isCustodio={permissions.isCustodio}
          tone="onImage"
          className="bg-black/35 backdrop-blur-sm"
        />
      </div>

      {/* Bottom-right: temporal + sharing metadata */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1 text-white/90 text-xs drop-shadow-sm">
          <Clock className="w-3 h-3" />
          <span>Actualizado {baul.lastUpdated}</span>
        </div>
        {baul.memberCount !== undefined && baul.memberCount > 1 && (
          <div className="flex items-center gap-1 text-white/90 text-xs drop-shadow-sm">
            <Users className="w-3 h-3" />
            <span>{baul.memberCount} miembros</span>
          </div>
        )}
      </div>
    </Button>
  );
}
