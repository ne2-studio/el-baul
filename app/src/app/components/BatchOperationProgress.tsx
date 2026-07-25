import { Icon } from './Icon';
import { icons } from './icons';

export interface BatchOperationItem {
  id: string;
  thumbnailUrl: string;
  status: 'pending' | 'success' | 'error';
}

interface BatchOperationProgressProps {
  title: string;
  items: BatchOperationItem[];
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
            <div key={item.id} className="relative aspect-square">
              <img
                src={item.thumbnailUrl}
                alt=""
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-background/90 shadow">
                {item.status === 'pending' && (
                  <Icon icon={icons.spinner} size="sm" className="text-muted-foreground animate-spin" aria-hidden />
                )}
                {/* text-green-600 is a raw color, not a theme token - the app has no
                    "success" token yet (see Icon.mdx). Left as-is; migrating it means
                    picking a token value, which is a design-system decision out of
                    scope here. */}
                {item.status === 'success' && (
                  <Icon icon={icons.check} size="sm" className="text-green-600" aria-hidden />
                )}
                {item.status === 'error' && (
                  <Icon icon={icons.close} size="sm" className="text-destructive" aria-hidden />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
