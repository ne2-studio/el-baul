import { Check, Loader2, X } from 'lucide-react';

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
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                )}
                {item.status === 'success' && <Check className="w-4 h-4 text-green-600" />}
                {item.status === 'error' && <X className="w-4 h-4 text-destructive" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
