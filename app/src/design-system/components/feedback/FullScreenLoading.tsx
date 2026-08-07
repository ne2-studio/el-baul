import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';

interface FullScreenLoadingProps {
  message: string;
}

// Único lenguaje visual para "esta pantalla todavía no tiene nada que enseñar" — login,
// refresco directo a un baúl/capítulo/foto, cambio a un baúl no visitado esta sesión. Sustituye
// la pantalla entera (no un fragmento de texto suelto ni un overlay sobre contenido a medias)
// para que nunca se vea un estado intermedio (tabs vacíos, "no encontrado" fantasma) mientras
// llegan los datos — ver guardBaulScope, que es quien la usa para las rutas bajo /baules/:baulId.
export function FullScreenLoading({ message }: FullScreenLoadingProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-lg animate-pulse">
            <BaulIcon className="w-12 h-12 text-primary-foreground" />
          </div>
        </div>
        <p className="text-lg text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
