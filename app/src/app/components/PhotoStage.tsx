import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoStageProps {
  src: string;
  alt: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

// Área central del visor: la foto a pantalla completa, con navegación por gestos (móvil) y botones (escritorio).
export function PhotoStage({ src, alt, hasPrevious, hasNext, onPrevious, onNext }: PhotoStageProps) {
  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
      {hasPrevious && (
        <div
          onClick={onPrevious}
          className="absolute left-0 top-0 bottom-0 w-1/4 z-10 md:hidden cursor-pointer"
          aria-label="Foto anterior"
        />
      )}

      {hasNext && (
        <div
          onClick={onNext}
          className="absolute right-0 top-0 bottom-0 w-1/4 z-10 md:hidden cursor-pointer"
          aria-label="Foto siguiente"
        />
      )}

      {hasPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 w-12 h-12 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors z-10 hidden md:flex"
        >
          <ChevronLeft className="w-6 h-6 text-background" />
        </button>
      )}

      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain select-none"
        draggable={false}
      />

      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-4 w-12 h-12 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors z-10 hidden md:flex"
        >
          <ChevronRight className="w-6 h-6 text-background" />
        </button>
      )}
    </div>
  );
}
