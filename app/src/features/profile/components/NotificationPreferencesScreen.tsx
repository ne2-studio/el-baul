import React from 'react';
import { Mail, Bell } from 'lucide-react';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { Toggle } from '@/design-system/components/forms/Toggle';

interface NotificationPreferencesScreenProps {
  onBack: () => void;
  weeklyDigestEnabled: boolean;
  onToggle: () => void;
  isSaving: boolean;
  // Android-only for now (see docs/architecture/native-android.md) — omit the row entirely on
  // other platforms rather than show a control that can't do anything there.
  showPushToggle: boolean;
  pushNotificationsEnabled: boolean;
  onTogglePush: () => void;
  isPushSaving: boolean;
}

export function NotificationPreferencesScreen({
  onBack,
  weeklyDigestEnabled,
  onToggle,
  isSaving,
  showPushToggle,
  pushNotificationsEnabled,
  onTogglePush,
  isPushSaving,
}: NotificationPreferencesScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader variant="inline" onBack={onBack} title="Notificaciones" />

      {/* Content */}
      <PageContainer className="py-8 space-y-8">
        <section>
          <p className="text-muted-foreground mb-3 uppercase tracking-wide text-xs">Notificaciones</p>

          <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
            <div className="flex w-full items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-4.5 h-4.5 text-primary" />
              </div>

              <Toggle
                checked={weeklyDigestEnabled}
                onChange={onToggle}
                disabled={isSaving}
                label="Resumen semanal por email"
                description={weeklyDigestEnabled
                  ? 'Recibirás cada semana un resumen de la actividad en tus baúles'
                  : 'No recibirás el resumen semanal de actividad'}
                className="flex-1"
              />
            </div>

            {showPushToggle && (
              <div className="flex w-full items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="w-4.5 h-4.5 text-primary" />
                </div>

                <Toggle
                  checked={pushNotificationsEnabled}
                  onChange={onTogglePush}
                  disabled={isPushSaving}
                  label="Notificaciones push"
                  description={pushNotificationsEnabled
                    ? 'Recibirás avisos en este dispositivo'
                    : 'No recibirás avisos en este dispositivo'}
                  className="flex-1"
                />
              </div>
            )}
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
