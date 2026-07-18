import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export function CrashFallback() {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="text-2xl mb-3 text-foreground">
          Algo ha ido mal
        </h2>

        <p className="text-muted-foreground mb-12">
          Hemos registrado el error. Prueba a recargar la aplicación.
        </p>

        <Button variant="primary" fullWidth onClick={() => window.location.reload()}>
          Recargar
        </Button>
      </div>
    </div>
  );
}
