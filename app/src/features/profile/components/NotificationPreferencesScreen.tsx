import React from 'react';
import { Mail } from 'lucide-react';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { Button } from '@/design-system/components/actions/Button';

interface NotificationPreferencesScreenProps {
  onBack: () => void;
  weeklyDigestEnabled: boolean;
  onToggle: () => void;
  isSaving: boolean;
}

export function NotificationPreferencesScreen({
  onBack,
  weeklyDigestEnabled,
  onToggle,
  isSaving,
}: NotificationPreferencesScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader variant="inline" onBack={onBack} title="Notificaciones" />

      {/* Content */}
      <PageContainer className="py-8 space-y-8">
        <section>
          <p className="text-muted-foreground mb-3 uppercase tracking-wide text-xs">Notificaciones</p>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <Button variant="plain"
              onClick={onToggle}
              disabled={isSaving}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-4.5 h-4.5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Resumen semanal por email</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {weeklyDigestEnabled
                    ? 'Recibirás cada semana un resumen de la actividad en tus baúles'
                    : 'No recibirás el resumen semanal de actividad'}
                </p>
              </div>

              <div
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                  weeklyDigestEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    weeklyDigestEnabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </Button>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
