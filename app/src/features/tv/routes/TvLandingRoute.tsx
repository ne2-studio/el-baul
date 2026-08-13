import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2 } from 'lucide-react';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { TvScreen } from '@/features/tv/components/TvScreen';
import { api, isApiErrorWithStatus } from '@/api';
import { TvPairing } from '@/types';

const POLL_INTERVAL_MS = 2000;

// Modo TV's one fixed entry point (see docs PRD "Modo TV"): instead of typing a session link
// into the TV, you always open this same URL, which shows a QR code. Scanning it (from the
// El Baúl app already signed in, or with any other camera) opens TvPairingRoute on the phone,
// which lets you pick a baúl and claims the pairing into a real TvSession — this screen just
// polls for that and jumps straight to TvSessionRoute once it happens. Anonymous, same
// reasoning as TvSessionRoute: the TV never authenticates as a user.
export function TvLandingRoute() {
  const navigate = useNavigate();
  const [pairing, setPairing] = useState<TvPairing | null>(null);
  const [hasError, setHasError] = useState(false);
  // Bumped to mint a fresh pairing after the current one goes stale before anyone scans it —
  // see the poll effect below.
  const [refreshKey, setRefreshKey] = useState(0);
  // Guards the poll loop against acting on a pairing that's already been superseded by a
  // newer one (e.g. after it expired and we silently created a fresh code) or against setting
  // state after the component unmounted.
  const currentCodeRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function createPairing() {
      try {
        const created = await api.tvPairings.create();
        if (cancelled) return;
        currentCodeRef.current = created.code;
        setPairing(created);
        setHasError(false);
      } catch {
        if (!cancelled) setHasError(true);
      }
    }

    setPairing(null);
    createPairing();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!pairing) return;

    const interval = setInterval(async () => {
      try {
        const status = await api.tvPairings.getStatus(pairing.code);
        if (currentCodeRef.current !== pairing.code) return;

        if (status.claimed && status.sessionToken) {
          navigate(`/tv/${status.sessionToken}`, { replace: true });
        }
      } catch (error) {
        if (currentCodeRef.current !== pairing.code) return;

        // The code went stale before anyone scanned it — quietly mint a new one rather than
        // stranding the TV on a dead QR code.
        if (isApiErrorWithStatus(error, 404)) {
          setRefreshKey((key) => key + 1);
        }
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pairing, navigate]);

  if (hasError) {
    return (
      <TvScreen>
        <BaulIcon className="w-11 h-11 text-background/50" />
        <p className="font-serif text-2xl text-background">No se ha podido abrir el baúl</p>
        <p className="text-sm text-background/60 max-w-md text-center leading-relaxed">
          Comprueba la conexión de la TV y vuelve a cargar esta página.
        </p>
      </TvScreen>
    );
  }

  if (!pairing) {
    return (
      <TvScreen>
        <BaulIcon className="w-11 h-11 text-background/90" />
        <p className="font-serif text-2xl text-background">Abriendo Baúl</p>
        <Loader2 className="w-6 h-6 text-background/70 animate-spin" />
      </TvScreen>
    );
  }

  return (
    <TvScreen>
      <BaulIcon className="w-11 h-11 text-background/90" />
      <p className="font-serif text-2xl text-background text-center">Ver el baúl en esta TV</p>
      <div className="bg-background rounded-2xl p-5">
        <QRCodeSVG value={pairing.claimUrl} size={220} />
      </div>
      <p className="text-sm text-background/60 max-w-sm text-center leading-relaxed">
        Escanea este código con tu móvil para elegir el baúl que quieres ver aquí.
      </p>
    </TvScreen>
  );
}
