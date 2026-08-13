import React from 'react';
import { BackButton } from '@/design-system/components/navigation/BackButton';
import { cn } from '@/design-system/components/ui/utils';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { StickyHeader } from '@/design-system/layouts/StickyHeader';

interface PageHeaderProps {
  /** Requerido salvo que `leading` lo sustituya (solo variante 'row'). */
  onBack?: () => void;
  /** Por defecto 'Volver' — pásalo p. ej. como 'Cancelar' en flujos de formulario/selección. */
  backLabel?: string;
  backDisabled?: boolean;
  title?: React.ReactNode;
  titleClassName?: string;
  /** No se usa en la variante 'row' (no tiene título propio). */
  subtitle?: React.ReactNode;
  /** Menú desplegable, insignia de selección, etc. En 'row' sustituye el layout entero; en
   * 'inline' se añade al lado derecho del título sin alterar el resto. No se usa en 'stacked'. */
  trailing?: React.ReactNode;
  /**
   * Solo se usa en la variante 'row' — sustituye al `BackButton` (p. ej. el selector de
   * workspace de BaulRoute, una pantalla que ya no tiene "atrás" al que volver). Si se omite,
   * se muestra el `BackButton` de siempre con `onBack`/`backLabel`/`backDisabled`.
   */
  leading?: React.ReactNode;
  /**
   * 'stacked': botón con texto encima del título — pantallas de creación/formulario.
   * 'inline': botón circular solo-icono junto al título — pantallas de detalle/ajustes.
   * 'row': botón con texto (o `leading`) + slot `trailing`, sin título propio (vive en un
   *        `Hero` debajo, salvo excepciones como BaulRoute) — pantallas de navegación de
   *        contenido con acciones contextuales.
   */
  variant: 'stacked' | 'inline' | 'row';
  className?: string;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(function PageHeader(
  { onBack, backLabel = 'Volver', backDisabled, title, titleClassName, subtitle, trailing, leading, variant, className },
  ref
) {
  if (variant === 'row') {
    return (
      <StickyHeader ref={ref}>
        <PageContainer className={cn('py-4', className)}>
          <div className="flex items-center justify-between">
            {leading ?? <BackButton onClick={onBack!} label={backLabel} disabled={backDisabled} />}
            {trailing}
          </div>
        </PageContainer>
      </StickyHeader>
    );
  }

  if (variant === 'inline') {
    return (
      <StickyHeader ref={ref}>
        <PageContainer className={cn('py-5 flex items-center gap-4', className)}>
          <BackButton onClick={onBack!} disabled={backDisabled} />
          <div className="flex-1">
            <h1 className={cn('text-3xl text-foreground', titleClassName)}>{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {trailing}
        </PageContainer>
      </StickyHeader>
    );
  }

  return (
    <StickyHeader ref={ref}>
      <PageContainer className={cn('py-5', className)}>
        <BackButton onClick={onBack!} label={backLabel} disabled={backDisabled} className="mb-3" />
        <h1 className={cn('text-3xl text-foreground', subtitle && 'mb-1', titleClassName)}>{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </PageContainer>
    </StickyHeader>
  );
});
