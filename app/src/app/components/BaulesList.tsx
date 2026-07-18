import React from 'react';
import { SimpleFAB } from './FAB';
import { EmptyState } from './EmptyState';
import { Crown, User, Users, Clock, UserCircle } from 'lucide-react';
import { BaulIcon } from './BaulIcon';
import { useUIStore } from '@/store/uiStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { BaulRole } from '@/types';
import { getRoleDisplayName } from '@/utils/roleUtils';

export interface Baul {
  id: string;
  name: string;
  description?: string;
  albumCount: number;
  coverPhotoUrl?: string;
  lastUpdated: string;
  isCustodio?: boolean;
  role?: BaulRole;
  sharedCount?: number;
}

interface BaulesListProps {
  baules: Baul[];
  onSelectBaul: (baul: Baul) => void;
  onCreateBaul: () => void;
  baulesUsed?: number;
  baulesLimit?: number;
}

export function BaulesList({ baules, onSelectBaul, onCreateBaul, baulesUsed, baulesLimit }: BaulesListProps) {
  const setShowProfileMenu = useUIStore(state => state.setShowProfileMenu);
  const monetizationEnabled = useAppConfigStore(state => state.monetizationEnabled);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-3xl font-serif text-foreground">El Baúl</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfileMenu(true)}
              className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
              aria-label="Abrir menú de cuenta"
            >
              <UserCircle className="w-6 h-6 text-primary" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6 pb-24">
        <section>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Mis baúles
          </h2>

          {baules.length === 0 ? (
            <EmptyState
              icon={<BaulIcon className="w-20 h-20" />}
              title="Aún no tienes baúles"
              subtitle="Crea tu primer baúl para empezar a guardar tus recuerdos más preciados"
            />
          ) : (
            <div className="space-y-4">
              {baules.map((baul) => (
                <BaulCard key={baul.id} baul={baul} onClick={() => onSelectBaul(baul)} />
              ))}
            </div>
          )}

          {/* Plan limit indicator */}
          {monetizationEnabled && baulesUsed !== undefined && baulesLimit !== undefined && (
            <div className="mt-4 px-1">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Baúles como custodio</span>
                <span className="font-medium text-foreground">
                  {baulesUsed} / {baulesLimit}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min((baulesUsed / baulesLimit) * 100, 100)}%` }}
                />
              </div>

              {/* Helper text */}
              {baulesUsed >= baulesLimit && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Has alcanzado el límite de tu plan
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      <SimpleFAB label="Nuevo baúl" onClick={onCreateBaul} />
    </div>
  );
}

// ─── Baul Card (full-bleed photo) ────────────────────────────────────────────

function BaulCard({ baul, onClick }: { baul: Baul; onClick: () => void }) {
  return (
    <button
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

      {/* Top-left: title + description + album count */}
      <div className="absolute top-4 left-4 right-16">
        <h3 className="font-serif text-white text-xl leading-tight mb-0.5 drop-shadow">
          {baul.name}
        </h3>
        {baul.description && (
          <p className="text-white/90 text-xs leading-snug line-clamp-1 drop-shadow-sm">{baul.description}</p>
        )}
        <p className="text-white/80 text-xs mt-1">
          {baul.albumCount} {baul.albumCount === 1 ? 'álbum' : 'álbumes'}
        </p>
      </div>

      {/* Bottom-left: role badge */}
      <div className="absolute bottom-4 left-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-sm text-white text-xs font-medium">
          {baul.isCustodio !== false ? (
            <>
              <Crown className="w-3 h-3" />
              Custodio
            </>
          ) : (
            <>
              <User className="w-3 h-3" />
              {getRoleDisplayName(baul.role ?? 'miembro')}
            </>
          )}
        </span>
      </div>

      {/* Bottom-right: temporal + sharing metadata */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1 text-white/90 text-xs drop-shadow-sm">
          <Clock className="w-3 h-3" />
          <span>Actualizado {baul.lastUpdated}</span>
        </div>
        {baul.sharedCount !== undefined && baul.sharedCount > 0 && (
          <div className="flex items-center gap-1 text-white/90 text-xs drop-shadow-sm">
            <Users className="w-3 h-3" />
            <span>{baul.sharedCount} {baul.sharedCount === 1 ? 'persona' : 'personas'}</span>
          </div>
        )}
      </div>
    </button>
  );
}
