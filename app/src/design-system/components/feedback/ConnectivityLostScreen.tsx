import { WifiOff } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';

export function ConnectivityLostScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex bg-background px-6 pt-safe pb-safe">
      <div className="m-auto w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted">
            <WifiOff className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="mb-3 text-2xl text-foreground">
          Sin conexión
        </h2>

        <p className="mb-12 text-muted-foreground">
          No podemos conectar con El Baúl. Revisa tu conexión y vuelve a intentarlo.
        </p>

        <Button variant="primary" fullWidth onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
