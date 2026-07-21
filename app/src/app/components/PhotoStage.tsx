import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, type PanInfo } from 'motion/react';

interface PhotoStageProps {
  photoKey: string;
  src: string;
  alt: string;
  /** +1 al avanzar, -1 al retroceder — decide de qué lado entra/sale la foto en la animación. */
  direction: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

const SWIPE_THRESHOLD = 80;

// Área central del visor: la foto a pantalla completa, con navegación por gestos de swipe
// (móvil y ratón, vía drag) y botones (escritorio), animada como un carrusel.
export function PhotoStage({ photoKey, src, alt, direction, hasPrevious, hasNext, onPrevious, onNext }: PhotoStageProps) {
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && hasNext) {
      onNext();
    } else if (info.offset.x > SWIPE_THRESHOLD && hasPrevious) {
      onPrevious();
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
      {hasPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 w-12 h-12 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors z-20 hidden md:flex"
        >
          <ChevronLeft className="w-6 h-6 text-background" />
        </button>
      )}

      <AnimatePresence initial={false} custom={direction}>
        <motion.img
          key={photoKey}
          src={src}
          alt={alt}
          custom={direction}
          initial={{ x: direction >= 0 ? '100%' : '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction >= 0 ? '-100%' : '100%', opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 w-full h-full object-contain select-none"
          draggable={false}
        />
      </AnimatePresence>

      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-4 w-12 h-12 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors z-20 hidden md:flex"
        >
          <ChevronRight className="w-6 h-6 text-background" />
        </button>
      )}
    </div>
  );
}
