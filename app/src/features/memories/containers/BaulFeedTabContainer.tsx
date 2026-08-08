import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';
import { Sparkles } from 'lucide-react';
import { FeedTab } from '@/features/memories/components/FeedTab';
import { FeedItem, Photo, PhotoBatch } from '@/types';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { loadBaulFeed, loadMoreBaulFeed } from '@/features/memories/useCases';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useRecuerdoActions } from './useRecuerdoActions';

interface BaulFeedTabContainerProps {
  baulId: string;
  baulName: string;
  // Reutiliza handleSelectChapter de BaulRoute (compartido con la pestaña de capítulos) en
  // vez de duplicar aquí su lógica de cargar-y-navegar — a diferencia de abrir una foto
  // (más abajo), esta acción sí tiene un caller que ya la necesita para otra cosa.
  onOpenChapter?: (chapterId: string) => void;
}

// Self-sufficient tab: with Features:BaulFeedEnabled off, reads baulRecuerdos (already
// preloaded by useBaulScope for every /baules/:baulId route) and shows recuerdo cards only,
// against the same GET /baules/{baulId}/recuerdos endpoint as before. With the toggle on, it
// lazily loads and reads the merged baulFeed instead (recuerdos + photo-upload-batch cards,
// sorted server-side by BaulFeedManager) — a genuinely new endpoint, not just a client-side
// filter, per the API-conventions "no breaking changes" rule. Either way FeedTab renders the
// same FeedItem[] shape, so the toggle only decides which source feeds it.
export function BaulFeedTabContainer({ baulId, baulName, onOpenChapter }: BaulFeedTabContainerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const { baulRecuerdos, baulFeed, baulFeedHasMore } = useRecuerdosStore();
  const baulFeedEnabled = useAppConfigStore((state) => state.baulFeedEnabled);
  const chatEnabled = useAppConfigStore((state) => state.chatEnabled);
  const sharedLinksEnabled = useAppConfigStore((state) => state.sharedLinksEnabled);
  const { editRecuerdo, shareRecuerdo } = useRecuerdoActions(baulName);
  const { run, isPending } = useAsyncAction();

  useEffect(() => {
    if (auth.isAuthenticated && baulFeedEnabled && !baulFeed[baulId]) {
      run(() => loadBaulFeed(baulId), { key: 'baul-feed', errorMessage: 'Error al cargar el feed' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, baulFeedEnabled, baulId, baulFeed]);

  const feedItems: FeedItem[] = baulFeedEnabled
    ? (baulFeed[baulId] || [])
    : (baulRecuerdos[baulId] || []).map((recuerdo): FeedItem => ({ type: 'recuerdo', createdAt: recuerdo.createdAt, recuerdo }));

  // Scroll infinito: solo con el toggle activo — la ruta antigua (baulRecuerdos) sigue sin
  // paginar, como siempre. 'baul-feed-more' es una key propia (distinta de 'baul-feed', la
  // carga inicial) para que cargar la siguiente página no dispare el overlay a pantalla
  // completa, solo el spinner en línea al final de la lista (ver FeedTab).
  const handleLoadMore = () => {
    if (!baulFeedEnabled || !baulFeedHasMore[baulId]) return;
    run(() => loadMoreBaulFeed(baulId), { key: 'baul-feed-more', errorMessage: 'Error al cargar más' });
  };

  const handleUserClick = (personaId: string) => {
    navigate(`/baules/${baulId}/personas/${personaId}`, { state: { returnTab: 'recuerdos' } });
  };

  const handleOpenPhoto = async (photoId: string, chapterId?: string) => {
    // Una foto suelta no tiene chapterId: sus fotos ya están cargadas por el efecto de
    // inicialización de BaulRoute (loadLoosePhotos), así que no hace falta cargar nada
    // antes de navegar.
    if (!chapterId) {
      openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/fotos-sueltas`, photoId));
      return;
    }

    const result = await run(() => loadChapterPhotos(chapterId), { errorMessage: 'Error al cargar las fotos' });
    if (result.ok) openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/capitulos/${chapterId}`, photoId));
  };

  // A diferencia de una foto de recuerdo (puede vivir en un capítulo cuyas fotos no estén
  // cargadas todavía), las fotos de un lote siempre se sirven desde su propio endpoint
  // acotado — no hace falta cargar nada antes de navegar, PhotoBatchViewerRoute las carga él
  // mismo si hace falta.
  const handleOpenBatchPhoto = (batch: PhotoBatch, photo: Photo) => {
    openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/subida/${batch.batchId}`, photo.id));
  };

  const handleOpenBatchGrid = (batch: PhotoBatch) => {
    navigate(`/baules/${baulId}/subida/${batch.batchId}`);
  };

  return (
    <>
      <FeedTab
        feedItems={feedItems}
        onOpenChapter={onOpenChapter}
        onOpenPhoto={handleOpenPhoto}
        onUserClick={handleUserClick}
        onShareRecuerdo={sharedLinksEnabled ? shareRecuerdo : undefined}
        onEditRecuerdo={editRecuerdo}
        onOpenBatchPhoto={handleOpenBatchPhoto}
        onOpenBatchGrid={handleOpenBatchGrid}
        onLoadMore={baulFeedEnabled ? handleLoadMore : undefined}
        hasMore={baulFeedEnabled ? (baulFeedHasMore[baulId] ?? false) : false}
        isLoadingMore={isPending('baul-feed-more')}
      />
      <SimpleFAB
        label="Recordemos juntos"
        icon={<Sparkles className="w-5 h-5" />}
        onClick={() => navigate(`/baules/${baulId}/recordar`)}
        hidden={!chatEnabled}
      />
      {isPending() && <BlockingLoadingOverlay message="Cargando fotos..." />}
      {isPending('baul-feed') && <BlockingLoadingOverlay message="Cargando el feed..." />}
    </>
  );
}
