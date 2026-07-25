import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useMotionValueEvent, animate, type PanInfo } from 'motion/react';

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
const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2;
const DOUBLE_TAP_MAX_DELAY_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 30;
const TAP_MAX_MOVE_PX = 10;

// Variantes como funciones de `custom` (en vez de objetos fijos) para que la foto que sale
// también recoja la dirección actual: una vez desmontada del árbol de React, AnimatePresence
// sigue reevaluando su variante "exit" con el último `custom` que le pasemos (ver `custom` en
// <AnimatePresence> más abajo). Con un objeto fijo, la foto saliente quedaría con la dirección
// que tenía en el momento en que ELLA ENTRÓ — coincide en swipes consecutivos del mismo sentido,
// pero en la primera inversión de sentido esa foto saliente animaría hacia el lado equivocado
// mientras la entrante (creada en el mismo render, con la dirección ya correcta) sí acierta.
const slideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? '-100%' : '100%', opacity: 0 }),
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function touchDistance(a: Touch, b: Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

// Área central del visor: la foto a pantalla completa, con navegación por gestos de swipe
// (móvil y ratón, vía drag) y botones (escritorio), animada como un carrusel. El zoom (doble
// toque y pellizco) vive en <ZoomableImage>, anidado dentro del contenedor que anima el
// carrusel — así el estado de zoom se reinicia solo al cambiar de foto (nueva instancia por
// cada `key={photoKey}`) sin necesidad de un efecto explícito.
export function PhotoStage({ photoKey, src, alt, direction, hasPrevious, hasNext, onPrevious, onNext }: PhotoStageProps) {
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
        <motion.div
          key={photoKey}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <ZoomableImage
            src={src}
            alt={alt}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        </motion.div>
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

function ZoomableImage({
  src, alt, hasPrevious, hasNext, onPrevious, onNext,
}: {
  src: string;
  alt: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useMotionValue(1);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchCount, setTouchCount] = useState(0);
  // Espejo en estado de React del valor en vivo de `scale`, solo para poder recalcular
  // `dragConstraints` (una prop, que Motion únicamente relee al renderizar) mientras el zoom
  // cambia — tanto durante el tween del doble toque como durante un pellizco.
  const [liveScale, setLiveScale] = useState(1);
  useMotionValueEvent(scale, 'change', setLiveScale);

  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const pinchRef = useRef<{ startDistance: number; startScale: number; startPanX: number; startPanY: number } | null>(null);

  // Cuánto se puede desplazar la imagen ampliada sin dejar huecos visibles, asumiendo que
  // ocupa aproximadamente el contenedor entero (aproximación razonable con object-contain).
  const panBounds = (atScale: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { maxX: 0, maxY: 0 };
    return {
      maxX: Math.max(0, (rect.width * (atScale - 1)) / 2),
      maxY: Math.max(0, (rect.height * (atScale - 1)) / 2),
    };
  };

  const clampPan = (atScale: number, x: number, y: number) => {
    const { maxX, maxY } = panBounds(atScale);
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  };

  const resetZoom = () => {
    animate(scale, 1, { duration: 0.2 });
    animate(panX, 0, { duration: 0.2 });
    animate(panY, 0, { duration: 0.2 });
    setIsZoomed(false);
  };

  const zoomToward = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    let targetX = 0;
    let targetY = 0;
    if (rect) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const clamped = clampPan(DOUBLE_TAP_ZOOM, -DOUBLE_TAP_ZOOM * (clientX - centerX), -DOUBLE_TAP_ZOOM * (clientY - centerY));
      targetX = clamped.x;
      targetY = clamped.y;
    }
    animate(scale, DOUBLE_TAP_ZOOM, { duration: 0.2 });
    animate(panX, targetX, { duration: 0.2 });
    animate(panY, targetY, { duration: 0.2 });
    setIsZoomed(true);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  };

  // Doble toque/clic: si ya hay zoom, lo quita; si no, amplía centrado en el punto tocado.
  // Se detecta a mano (en vez de con onDoubleClick) para que funcione igual con ratón y con
  // touch, y sin fiarse de que el navegador sintetice un 'dblclick' fiable en touch.
  const handlePointerUp = (e: React.PointerEvent) => {
    const downPos = pointerDownRef.current;
    pointerDownRef.current = null;
    if (touchCount > 0) return; // segundo dedo aún activo — no es un toque simple
    if (!downPos || Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > TAP_MAX_MOVE_PX) return;

    const now = Date.now();
    const lastTap = lastTapRef.current;
    if (lastTap && now - lastTap.time < DOUBLE_TAP_MAX_DELAY_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_MAX_DISTANCE_PX) {
      lastTapRef.current = null;
      if (scale.get() > 1) resetZoom();
      else zoomToward(e.clientX, e.clientY);
    } else {
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    }
  };

  // Pellizco con dos dedos: se gestiona a mano con Touch Events porque el gesto de drag de
  // Motion es de un único puntero. Mientras haya 2 dedos, se desactiva `drag` (más abajo) para
  // que Motion no interprete el primer dedo como el inicio de un arrastre.
  // Se registran como listeners nativos (no como props onTouch* de React) porque React
  // adjunta los listeners de touch como pasivos por defecto, y necesitamos poder llamar
  // preventDefault en touchmove para evitar que el navegador interprete el pellizco como un
  // zoom/scroll de página — con un listener pasivo esa llamada no tiene efecto (y además
  // avisa por consola).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchCount(e.touches.length);
      if (e.touches.length === 2) {
        pinchRef.current = {
          startDistance: touchDistance(e.touches[0], e.touches[1]),
          startScale: scale.get(),
          startPanX: panX.get(),
          startPanY: panY.get(),
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const { startDistance, startScale, startPanX, startPanY } = pinchRef.current;
        const nextScale = clamp(startScale * (touchDistance(e.touches[0], e.touches[1]) / startDistance), 1, MAX_ZOOM);
        // El pan escala junto con el zoom para que el punto medio del pellizco se mantenga
        // aproximadamente anclado en su sitio, en vez de recentrarse de golpe.
        const scaleRatio = nextScale / startScale;
        const clamped = clampPan(nextScale, startPanX * scaleRatio, startPanY * scaleRatio);
        scale.set(nextScale);
        panX.set(clamped.x);
        panY.set(clamped.y);
        setIsZoomed(nextScale > 1.01);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      setTouchCount(e.touches.length);
      if (e.touches.length < 2) {
        pinchRef.current = null;
        if (scale.get() <= 1.01) {
          resetZoom();
        } else {
          const clamped = clampPan(scale.get(), panX.get(), panY.get());
          animate(panX, clamped.x, { duration: 0.2 });
          animate(panY, clamped.y, { duration: 0.2 });
        }
      }
    };

    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Con zoom activo, el drag de un solo dedo desplaza la foto (paneo); sin zoom, es el swipe
  // de navegación entre fotos de siempre.
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (isZoomed) return;
    if (info.offset.x < -SWIPE_THRESHOLD && hasNext) {
      onNext();
    } else if (info.offset.x > SWIPE_THRESHOLD && hasPrevious) {
      onPrevious();
    }
  };

  // Cotas de arrastre a partir de `liveScale` (estado en vivo, no `scale.get()` leído una
  // sola vez al renderizar) para que se recalculen mientras el zoom cambia — durante el tween
  // del doble toque y durante un pellizco — y no queden congeladas en la escala que había en
  // el render en que `isZoomed` pasó a true.
  const { maxX, maxY } = panBounds(liveScale);
  const dragConstraints = isZoomed ? { left: -maxX, right: maxX, top: -maxY, bottom: maxY } : { left: 0, right: 0 };

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center overflow-hidden touch-none">
      <motion.img
        src={src}
        alt={alt}
        style={{ scale, x: panX, y: panY }}
        drag={touchCount >= 2 ? false : (isZoomed ? true : 'x')}
        dragConstraints={dragConstraints}
        dragElastic={isZoomed ? 0.05 : 0.7}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="w-full h-full object-contain select-none touch-none"
        draggable={false}
      />
    </div>
  );
}
