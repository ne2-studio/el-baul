import { useEffect, useRef, useState } from 'react';
import { API_CONNECTIVITY_LOST_EVENT } from '@/api';

// Regresión issue #38: "Pantalla de 'Sin conexión' salta demasiado a menudo" — mostrar el
// splash de conectividad ya no debería exigir una recarga manual completa para recuperarse
// (App.tsx antes solo lo quitaba con location.reload()). Mientras el splash está visible,
// escuchamos el evento `online` del navegador y, al recibirlo, limpiamos el estado y avisamos
// a quien llama (App.tsx) para que reintente cargar los datos — sin recargar la página. El
// botón "Reintentar" del propio splash puede seguir recargando como fallback manual.
export function useConnectivityLost(onRecovered: () => void): boolean {
  const [isConnectivityLost, setIsConnectivityLost] = useState(false);

  // Ref instead of a dependency so the 'online' listener always calls the latest
  // onRecovered (App.tsx passes a fresh closure every render, closing over current auth
  // state) without tearing down/re-adding the listener on every unrelated re-render.
  const onRecoveredRef = useRef(onRecovered);
  onRecoveredRef.current = onRecovered;

  useEffect(() => {
    const handleConnectivityLost = () => setIsConnectivityLost(true);
    window.addEventListener(API_CONNECTIVITY_LOST_EVENT, handleConnectivityLost);
    return () => window.removeEventListener(API_CONNECTIVITY_LOST_EVENT, handleConnectivityLost);
  }, []);

  useEffect(() => {
    if (!isConnectivityLost) return;
    const handleOnline = () => {
      setIsConnectivityLost(false);
      onRecoveredRef.current();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isConnectivityLost]);

  return isConnectivityLost;
}
