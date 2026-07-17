import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Archive, Plus, ChevronRight, Crown, Users2, User, UserCircle } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';

export interface Baul {
  id: string;
  name: string;
  description?: string;
  albumCount: number;
  lastUpdated: string;
  isCustodio?: boolean;
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
          <h1 className="text-3xl text-foreground">Mis baúles</h1>
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
      <div className="max-w-2xl mx-auto px-6 py-6">
        {baules.length === 0 ? (
          <EmptyState
            icon={<Archive className="w-20 h-20" strokeWidth={1.5} />}
            title="Aún no tienes baúles"
            subtitle="Crea tu primer baúl para empezar a guardar tus recuerdos más preciados"
          />
        ) : (
          <div className="space-y-4">
            {baules.map((baul) => (
              <Card key={baul.id} onClick={() => onSelectBaul(baul)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl mb-1 text-foreground">{baul.name}</h3>
                    {baul.description && (
                      <p className="text-sm text-muted-foreground mb-3">{baul.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{baul.albumCount} {baul.albumCount === 1 ? 'álbum' : 'álbumes'}</span>
                      <span>·</span>
                      <span>Actualizado {baul.lastUpdated}</span>
                    </div>
                    
                    {/* Role and sharing indicators - subtle */}
                    <div className="flex items-center gap-3 mt-3">
                      {/* Ownership indicator */}
                      {baul.isCustodio !== undefined && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10">
                          {baul.isCustodio ? (
                            <>
                              <Crown className="w-3.5 h-3.5 text-primary" />
                              <span className="text-xs text-primary font-medium">Custodio</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Compartido contigo</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* Sharing count indicator - only for custodian */}
                      {baul.isCustodio && baul.sharedCount !== undefined && baul.sharedCount > 0 && (
                        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users2 className="w-3.5 h-3.5" />
                          <span>Compartido con {baul.sharedCount} {baul.sharedCount === 1 ? 'persona' : 'personas'}</span>
                        </div>
                      )}
                      
                      {/* Private indicator */}
                      {baul.isCustodio && (baul.sharedCount === undefined || baul.sharedCount === 0) && (
                        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/50">
                          <User className="w-3.5 h-3.5" />
                          <span>Solo tú</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground mt-1" />
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
            onClick={onCreateBaul}
            className="flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo baúl
          </Button>

          {/* Plan limit indicator */}
          {monetizationEnabled && baulesUsed !== undefined && baulesLimit !== undefined && (
            <div className="mt-3 px-4">
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
        </div>
      </div>
    </div>
  );
}