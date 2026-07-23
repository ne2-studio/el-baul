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

// Variantes como funciones de `custom` (en vez de objetos fijos) para que la foto que sale
// también recoja la dirección actual: una vez desmontada del árbol de React, AnimatePresence
// sigue reevaluando su variante "exit" con el último `custom` que le pasemos (ver `custom` en
// <AnimatePresence> más abajo). Con un objeto fijo, la foto saliente quedaría con la dirección
// que tenía en el momento en que ELLA ENTRÓ — coincide en swipes consecutivos del mismo sentido,
// pero en la primera inversión de sentido esa foto saliente animaría hacia el lado equivocado
// mientras la entrante (creada en el mismo render, con la dirección ya correcta) sí acierta.
const variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? '-100%' : '100%', opacity: 0 }),
};

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
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
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
