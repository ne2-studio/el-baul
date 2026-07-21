import { ShieldOff } from 'lucide-react';

export function AccessDenied() {
  return (
    <div className="flex items-center justify-center py-24 px-6">
      <div className="text-center max-w-md">
        <ShieldOff className="w-10 h-10 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
        <h2 className="mb-2">Acceso denegado</h2>
        <p className="text-muted-foreground">
          Tu cuenta no tiene permisos de administrador para el backoffice de El Baúl.
        </p>
      </div>
    </div>
  );
}
