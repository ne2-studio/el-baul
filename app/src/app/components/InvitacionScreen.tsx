import React from 'react';
import { Button } from './Button';
import { BaulIcon } from './BaulIcon';

interface InvitacionScreenProps {
  baulNombre: string;
  previewPhotos: string[];
  onUnirme: () => void;
  onVerMas: () => void;
}

export function InvitacionScreen({
  baulNombre,
  previewPhotos,
  onUnirme,
  onVerMas
}: InvitacionScreenProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        {/* Header con icono */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <BaulIcon className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Título del baúl invitado */}
        <h1 className="text-3xl text-center mb-2 text-foreground">
          {baulNombre}
        </h1>

        {/* Mensaje de invitación */}
        <p className="text-center text-muted-foreground mb-8">
          Te han invitado a un Baúl privado para guardar recuerdos
        </p>

        {/* Grid de fotos de preview */}
        <div className="mb-8 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-2 gap-2">
            {previewPhotos.slice(0, 4).map((photo, index) => (
              <div
                key={index}
                className={`relative ${index === 0 ? 'col-span-2 h-48' : 'h-32'} bg-muted overflow-hidden rounded-xl`}
              >
                <img
                  src={photo}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            variant="primary"
            fullWidth
            onClick={onUnirme}
          >
            Unirme al Baúl
          </Button>

          <button
            onClick={onVerMas}
            className="w-full text-muted-foreground hover:text-foreground transition-colors py-3 text-sm"
          >
            Ver de qué va esto
          </button>
        </div>
      </div>
    </div>
  );
}
