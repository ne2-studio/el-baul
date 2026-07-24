import type { ReactNode } from 'react';

interface AsyncStateProps {
  isLoading: boolean;
  error: string | null;
  hasData: boolean;
  loadingText?: string;
  loadingClassName?: string;
  /**
   * Render children once loading finishes even when hasData is false — for
   * list views where a legitimate zero-row result is renderable (the
   * DataTable shows its own empty message). Detail views that dereference
   * the loaded object should leave this false so they don't render on null.
   */
  renderWhenEmpty?: boolean;
  children: ReactNode;
}

/**
 * Shared loading/error/data guard for the two route-rendering idioms in this
 * app: full-page detail views and list views wrapping a DataTable.
 */
export function AsyncState({
  isLoading,
  error,
  hasData,
  loadingText = 'Cargando…',
  loadingClassName = 'text-muted-foreground',
  renderWhenEmpty = false,
  children,
}: AsyncStateProps) {
  if (isLoading && !hasData) {
    return <p className={loadingClassName}>{loadingText}</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!hasData && !renderWhenEmpty) {
    return null;
  }

  return <>{children}</>;
}
