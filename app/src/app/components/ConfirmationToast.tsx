interface ConfirmationToastProps {
  message: string;
}

// Aviso flotante que confirma una acción; el llamador controla cuánto tiempo se muestra.
export function ConfirmationToast({ message }: ConfirmationToastProps) {
  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[70] animate-slide-down">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4">
        <p className="text-foreground text-sm">
          {message}
        </p>
      </div>
    </div>
  );
}
