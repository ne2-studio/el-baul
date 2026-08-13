import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { TvScreen } from '@/features/tv/components/TvScreen';
import { formatPartialDate } from '@/app/utils/timeUtils';
import { api } from '@/api';
import { TvPhoto, TvSessionContent } from '@/types';

type ScreenState =
  | { status: 'loading' }
  | { status: 'expired' }
  | { status: 'empty'; baulName: string }
  | { status: 'ready'; content: TvSessionContent };

// Modo TV's actual viewing screen: full-bleed, dark, read-only — deliberately not a responsive
// reuse of the mobile app (see docs PRD "Modo TV"). The TV only ever lands here by being
// redirected from TvLandingRoute once its QR code gets claimed; the token in the URL is the
// only credential, so this route sits outside ProtectedRoute/PublicRoute entirely (same pattern
// as BaulGlobalInvitacionRoute for the public invite landing).
export function TvSessionRoute() {
  const { token } = useParams<{ token: string }>();
  const [screen, setScreen] = useState<ScreenState>({ status: 'loading' });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showContext, setShowContext] = useState(false);

  useEffect(() => {
    if (!token) {
      setScreen({ status: 'expired' });
      return;
    }
    api.tvSessions
      .getContent(token)
      .then((content) => {
        setScreen(content.photos.length > 0 ? { status: 'ready', content } : { status: 'empty', baulName: content.baulName });
      })
      .catch(() => setScreen({ status: 'expired' }));
  }, [token]);

  const photos = screen.status === 'ready' ? screen.content.photos : [];
  const photoCount = photos.length;

  const goToPrevious = useCallback(() => {
    setShowContext(false);
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const goToNext = useCallback(() => {
    setShowContext(false);
    setCurrentIndex((index) => Math.min(photoCount - 1, index + 1));
  }, [photoCount]);

  // D-pad/keyboard navigation — ArrowLeft/ArrowRight to move, Enter/OK to toggle context. Some
  // TVs drive a virtual mouse instead of D-pad focus, so click zones below cover the same
  // actions. Back is left to the TV browser's own remote handling (no in-app history to pop):
  // see PRD's "Back Salir" note.
  useEffect(() => {
    if (screen.status !== 'ready') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goToPrevious();
      else if (event.key === 'ArrowRight') goToNext();
      else if (event.key === 'Enter') setShowContext((visible) => !visible);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen.status, goToPrevious, goToNext]);

  if (screen.status === 'loading') {
    return (
      <TvScreen>
        <BaulIcon className="w-11 h-11 text-background/90" />
        <p className="font-serif text-2xl text-background">Abriendo Baúl</p>
        <Loader2 className="w-6 h-6 text-background/70 animate-spin" />
      </TvScreen>
    );
  }

  if (screen.status === 'expired') {
    return (
      <TvScreen>
        <Clock className="w-10 h-10 text-background/50" />
        <p className="font-serif text-2xl text-background">La sesión ha caducado</p>
        <p className="text-sm text-background/60 max-w-md text-center leading-relaxed">
          Genera un nuevo acceso desde tu móvil para seguir viendo el baúl juntos.
        </p>
      </TvScreen>
    );
  }

  if (screen.status === 'empty') {
    return (
      <TvScreen>
        <BaulIcon className="w-12 h-12 text-background/35" />
        <p className="font-serif text-2xl text-background">Este baúl no tiene fotos todavía</p>
        <p className="text-sm text-background/60 max-w-md text-center">
          Vuelve a intentarlo cuando haya recuerdos que compartir.
        </p>
      </TvScreen>
    );
  }

  const photo = photos[currentIndex];

  return (
    <div className="fixed inset-0 bg-foreground overflow-hidden">
      <img src={photo.imageUrl} alt="" className="w-full h-full object-contain" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: showContext
            ? 'linear-gradient(180deg, rgba(0,0,0,.3) 0%, transparent 22%, transparent 48%, rgba(0,0,0,.82) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 18%, transparent 78%, rgba(0,0,0,.3) 100%)',
        }}
      />

      <p className="absolute top-4 left-5 text-sm font-semibold text-white/85">{screen.content.baulName}</p>

      {/* Click zones for TVs whose remotes drive a virtual mouse instead of D-pad focus: left/right
          25% strips page through photos, the central 50% toggles the context overlay. */}
      <div className="absolute inset-0 flex">
        <button
          type="button"
          aria-label="Foto anterior"
          className="w-1/4 h-full cursor-default"
          onClick={goToPrevious}
        />
        <button
          type="button"
          aria-label={showContext ? 'Ocultar información' : 'Mostrar información'}
          className="w-1/2 h-full cursor-default"
          onClick={() => setShowContext((visible) => !visible)}
        />
        <button
          type="button"
          aria-label="Foto siguiente"
          className="w-1/4 h-full cursor-default"
          onClick={goToNext}
        />
      </div>

      {currentIndex > 0 && (
        <div className="absolute inset-y-0 left-3 flex items-center">
          <ChevronLeft className="w-9 h-9 text-white/80" />
        </div>
      )}
      {currentIndex < photoCount - 1 && (
        <div className="absolute inset-y-0 right-3 flex items-center">
          <ChevronRight className="w-9 h-9 text-white/80" />
        </div>
      )}

      <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/80">
        {currentIndex + 1} / {photoCount}
      </p>

      {showContext && <TvContextOverlay photo={photo} />}
    </div>
  );
}

function TvContextOverlay({ photo }: { photo: TvPhoto }) {
  const dateLabel = photo.date ? formatPartialDate(photo.date) : null;
  const peopleLabel = photo.personaNames.length > 0 ? photo.personaNames.join(' · ') : null;

  return (
    <div className="absolute left-0 right-0 bottom-0 px-6 pb-7 pt-4">
      {photo.chapterName && (
        <span className="inline-block bg-primary/90 text-primary-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full mb-2">
          {photo.chapterName}
        </span>
      )}
      {dateLabel && <p className="font-serif text-xl text-white">{dateLabel}</p>}
      {peopleLabel && <p className="text-xs text-white/75 mt-1 mb-2">{peopleLabel}</p>}
      {photo.quote && (
        <p className="text-xs text-white/90 italic">
          "{photo.quote}"{photo.quoteAuthor && <> — {photo.quoteAuthor}</>}
        </p>
      )}
    </div>
  );
}
