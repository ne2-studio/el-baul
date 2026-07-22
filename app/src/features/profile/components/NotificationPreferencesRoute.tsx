import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationPreferencesScreen } from '@/app/components/NotificationPreferencesScreen';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/api';

export const NotificationPreferencesRoute: React.FC = () => {
  const navigate = useNavigate();
  const { setShowProfileMenu } = useUIStore();
  const { run, isPending } = useAsyncAction();
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    run(() => api.users.getProfile(), { errorMessage: 'No se pudieron cargar tus preferencias.' }).then((result) => {
      if (result.ok) setWeeklyDigestEnabled(result.value.weeklyDigestEnabled);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async () => {
    if (weeklyDigestEnabled === null) return;
    const next = !weeklyDigestEnabled;
    const result = await run(() => api.users.updateNotificationPreferences(next), {
      successMessage: next ? 'Resumen semanal activado' : 'Resumen semanal desactivado',
      errorMessage: 'No se pudo actualizar la preferencia.',
    });
    if (result.ok) setWeeklyDigestEnabled(result.value.weeklyDigestEnabled);
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
