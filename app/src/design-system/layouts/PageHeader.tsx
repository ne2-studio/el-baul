import React from 'react';
import { BackButton } from '@/design-system/components/navigation/BackButton';
import { cn } from '@/design-system/components/ui/utils';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { StickyHeader } from '@/design-system/layouts/StickyHeader';

interface PageHeaderProps {
  onBack: () => void;
  /** Por defecto 'Volver' — pásalo p. ej. como 'Cancelar' en flujos de formulario/selección. */
  backLabel?: string;
  backDisabled?: boolean;
  title?: React.ReactNode;
  titleClassName?: string;
  /** No se usa en la variante 'row' (no tiene título propio). */
  subtitle?: React.ReactNode;
  /** Solo se usa en la variante 'row' — menú desplegable, insignia de selección, etc. */
  trailing?: React.ReactNode;
  /**
   * 'stacked': botón con texto encima del título — pantallas de creación/formulario.
   * 'inline': botón circular solo-icono junto al título — pantallas de detalle/ajustes.
   * 'row': botón con texto + slot `trailing`, sin título propio (vive en un `Hero` debajo)
   *        — pantallas de navegación de contenido con acciones contextuales.
   */
  variant: 'stacked' | 'inline' | 'row';
  className?: string;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(function PageHeader(
  { onBack, backLabel = 'Volver', backDisabled, title, titleClassName, subtitle, trailing, variant, className },
  ref
) {
  if (variant === 'row') {
    return (
      <StickyHeader ref={ref}>
        <PageContainer className={cn('py-4', className)}>
          <div className="flex items-center justify-between">
            <BackButton onClick={onBack} label={backLabel} disabled={backDisabled} />
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
          <BackButton onClick={onBack} disabled={backDisabled} />
          <div>
            <h1 className={cn('text-3xl text-foreground', titleClassName)}>{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </PageContainer>
      </StickyHeader>
    );
  }

  return (
    <StickyHeader ref={ref}>
      <PageContainer className={cn('py-5', className)}>
        <BackButton onClick={onBack} label={backLabel} disabled={backDisabled} className="mb-3" />
        <h1 className={cn('text-3xl text-foreground', subtitle && 'mb-1', titleClassName)}>{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </PageContainer>
    </StickyHeader>
  );
});
