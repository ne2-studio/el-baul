import React, { useState } from 'react';
import { ChevronLeft, Camera, X, CheckCircle, Info } from 'lucide-react';
import { Button } from './Button';

interface SupportFormScreenProps {
  title: string;
  onBack: () => void;
  onSubmit: (message: string, screenshot?: File) => Promise<void>;
}

export function SupportFormScreen({ title, onBack, onSubmit }: SupportFormScreenProps) {
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async () => {
    if (!message.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setHasError(false);
    try {
      await onSubmit(message.trim(), screenshot ?? undefined);
      setSucceeded(true);
    } catch {
      setHasError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (succeeded) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-3xl mb-3 text-foreground">Hemos recibido tu mensaje</h2>
          <p className="text-muted-foreground mb-12">
            Gracias por escribirnos. Lo revisaremos lo antes posible y te responderemos por correo electrónico.
          </p>
          <Button variant="primary" fullWidth onClick={onBack}>
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-4">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors -ml-2 disabled:opacity-50"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-3xl text-foreground">{title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Cuéntanos qué ha pasado o cómo podemos ayudarte."
          disabled={isSubmitting}
          className="w-full min-h-[160px] p-4 bg-card border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground placeholder:text-muted-foreground mb-4"
          autoFocus
        />

        {/* Screenshot */}
        {screenshotPreview ? (
          <div className="relative inline-block mb-6">
            <img
              src={screenshotPreview}
              alt="Captura de pantalla"
              className="w-24 h-24 object-cover rounded-xl border border-border"
            />
            <button
              onClick={handleRemoveScreenshot}
              disabled={isSubmitting}
              className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="inline-flex items-center gap-2 px-4 py-2.5 mb-6 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors cursor-pointer">
            <Camera className="w-4 h-4 text-muted-foreground" />
            Adjuntar una captura de pantalla
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScreenshotChange}
              disabled={isSubmitting}
            />
          </label>
        )}

        {/* Technical info notice */}
        <div className="flex items-start gap-3 bg-muted/50 rounded-xl p-4 mb-6">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Incluiremos algunos datos técnicos para poder ayudarte más rápido.
          </p>
        </div>

        {hasError && (
          <p className="text-sm text-destructive mb-4">
            No hemos podido enviar tu mensaje. Inténtalo de nuevo dentro de unos minutos.
          </p>
        )}

        <Button
          variant="primary"
          fullWidth
          onClick={handleSubmit}
          disabled={!message.trim() || isSubmitting}
          isLoading={isSubmitting}
        >
          Enviar
        </Button>
      </div>
    </div>
  );
}
