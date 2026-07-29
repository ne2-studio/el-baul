import React from 'react';
import { cn } from '@/design-system/components/ui/utils';
import { PageContainer } from '@/design-system/layouts/PageContainer';

/** Shared height for every screen hero — keep in sync across Baúl, Capítulo and Persona
 * so switching between them doesn't visually jump. */
export const HERO_HEIGHT = 210;

interface HeroProps {
  imageUrl?: string;
  imageAlt?: string;
  imageStyle?: React.CSSProperties;
  /** false para imágenes ya recortadas a un tamaño fijo (p. ej. avatares de persona), donde
   * el desenfoque anti-pixelado de las fotos de portada no aplica. */
  blurUpscaledImage?: boolean;
  title: React.ReactNode;
  children?: React.ReactNode;
}

export function Hero({ imageUrl, imageAlt = '', imageStyle, blurUpscaledImage = true, title, children }: HeroProps) {
  return (
    <div className="relative overflow-hidden" style={{ height: HERO_HEIGHT }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          className={cn('absolute inset-0 w-full h-full object-cover', blurUpscaledImage && 'hero-cover-image')}
          style={imageStyle}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/30 to-foreground/50" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 pb-5">
        <PageContainer>
          <h1 className="text-3xl font-serif text-white leading-tight" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>
            {title}
          </h1>
          {children}
        </PageContainer>
      </div>
    </div>
  );
}
