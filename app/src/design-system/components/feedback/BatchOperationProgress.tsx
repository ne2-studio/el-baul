import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';

export interface BatchOperationItem {
  id: string;
  thumbnailUrl: string;
  status: 'pending' | 'success' | 'error';
}

interface BatchOperationProgressProps {
  title: string;
  items: BatchOperationItem[];
}

interface BatchOperationThumbProps {
  thumbnailUrl: string;
  status: BatchOperationItem['status'];
}

export function BatchOperationThumb({ thumbnailUrl, status }: BatchOperationThumbProps) {
  return (
    <div className="relative aspect-square">
      <img
        src={thumbnailUrl}
        alt=""
        className="w-full h-full object-cover rounded-lg"
      />
      <div className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-background/90 shadow">
        {status === 'pending' && (
          <Icon icon={icons.spinner} size="sm" className="text-muted-foreground animate-spin" aria-hidden />
        )}
        {status === 'success' && (
          <Icon icon={icons.check} size="sm" className="text-green-600" aria-hidden />
        )}
        {status === 'error' && (
          <Icon icon={icons.close} size="sm" className="text-destructive" aria-hidden />
        )}
      </div>
    </div>
  );
}

// Progreso ítem a ítem para operaciones por lote que hacen una petición por elemento
// (p. ej. mover fotos) — mismo lenguaje visual que UploadingScreen.
export function BatchOperationProgress({ title, items }: BatchOperationProgressProps) {
  const succeededCount = items.filter((i) => i.status === 'success').length;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl mb-3 text-foreground">{title}</h2>
        <p className="text-muted-foreground mb-8">
          {succeededCount} de {items.length} fotos procesadas
        </p>

        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => (
            <BatchOperationThumb key={item.id} thumbnailUrl={item.thumbnailUrl} status={item.status} />
          ))}
        </div>
      </div>
    </div>
  );
}
