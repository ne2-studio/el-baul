import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationPreferencesScreen } from '@/features/profile/components/NotificationPreferencesScreen';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/useAuthStore';
import { loadNotificationPreferences, updateNotificationPreferences } from '@/features/profile/useCases';

export const NotificationPreferencesRoute: React.FC = () => {
  const navigate = useNavigate();
  const { setShowProfileMenu } = useUIStore();
  const { run, isPending } = useAsyncAction();
  const { weeklyDigestEnabled } = useAuthStore();

  useEffect(() => {
    // No-ops if the session-level bootstrap (features/auth/useCases) has already populated
    // this — see loadNotificationPreferences.
    run(() => loadNotificationPreferences(), { errorMessage: 'No se pudieron cargar tus preferencias.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async () => {
    if (weeklyDigestEnabled === null) return;
    const next = !weeklyDigestEnabled;
    await run(() => updateNotificationPreferences(next), {
      successMessage: next ? 'Resumen semanal activado' : 'Resumen semanal desactivado',
      errorMessage: 'No se pudo actualizar la preferencia.',
    });
  };

  if (weeklyDigestEnabled === null) return null;

  return (
    <NotificationPreferencesScreen
      onBack={() => {
        setShowProfileMenu(false);
        navigate('/baules');
      }}
      weeklyDigestEnabled={weeklyDigestEnabled}
      onToggle={handleToggle}
      isSaving={isPending()}
    />
  );
};
