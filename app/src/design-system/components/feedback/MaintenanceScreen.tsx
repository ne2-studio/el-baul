import { Wrench } from 'lucide-react';

// No CTA by design: maintenance mode also 503s every other backend request (see
// MaintenanceModeMiddleware), so there is nothing a "reintentar"/"volver" button could
// meaningfully do here — the user just has to wait it out.
export function MaintenanceScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex bg-background px-6 pt-safe pb-safe">
      <div className="m-auto w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted">
            <Wrench className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="mb-3 text-2xl text-foreground">
          El Baúl está en mantenimiento
        </h2>

        <p className="text-muted-foreground">
          Estamos haciendo mejoras. Vuelve a intentarlo en unos minutos.
        </p>
      </div>
    </div>
  );
}
