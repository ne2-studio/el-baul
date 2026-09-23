import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppConfigStore } from '@/store/useAppConfigStore';

interface DevicePhotosGateProps {
  children: React.ReactNode;
}

// Guards "En este dispositivo"'s own routes (grid, album, photo viewer) against the
// DevicePhotosEnabled ops kill switch (docs/.backlog issue #83). WorkspaceSwitcherContainer
// already drops the menu entry while the flag is off, but that alone doesn't stop a direct URL
// or a stale deep link from reaching these screens — this wraps each of those routes (alongside
// their own ProtectedRoute) to redirect to "Mis fotos" instead, its own PERSONAL sibling.
export const DevicePhotosGate: React.FC<DevicePhotosGateProps> = ({ children }) => {
  const devicePhotosEnabled = useAppConfigStore((state) => state.devicePhotosEnabled);

  if (!devicePhotosEnabled) return <Navigate to="/mis-fotos" replace />;

  return <>{children}</>;
};
