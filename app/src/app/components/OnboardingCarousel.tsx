import React, { useState } from 'react';
import { Button } from './Button';
import { Folder, Users, ChevronRight } from 'lucide-react';
import { BaulIcon } from './BaulIcon';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingCarouselProps {
  baulNombre: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingCarousel({
  baulNombre,
  onComplete,
  onSkip
}: OnboardingCarouselProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Un lugar para lo que de verdad importa',
      description: 'En lugar de perder fotos en chats o carpetas, aquí las guardas en un espacio compartido con tu gente.',
      icon: BaulIcon,
      visual: (
        <div className="flex gap-4 items-center justify-center">
          {/* Lado A - Caos */}
          <div className="flex-1 opacity-40">
            <div className="text-xs text-muted-foreground mb-2 text-center">Antes</div>
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded-lg flex items-center px-2">
                <div className="w-6 h-6 bg-muted-foreground/20 rounded mr-2" />
                <div className="h-2 bg-muted-foreground/20 rounded flex-1" />
              </div>
              <div className="h-8 bg-muted rounded-lg flex items-center px-2">
                <div className="w-6 h-6 bg-muted-foreground/20 rounded mr-2" />
                <div className="h-2 bg-muted-foreground/20 rounded flex-1" />
              </div>
              <div className="h-8 bg-muted rounded-lg flex items-center px-2">
                <div className="w-6 h-6 bg-muted-foreground/20 rounded mr-2" />
                <div className="h-2 bg-muted-foreground/20 rounded flex-1" />
              </div>
            </div>
          </div>

          {/* Separador */}
          <ChevronRight className="w-5 h-5 text-primary" />

          {/* Lado B - Organizado */}
          <div className="flex-1">
            <div className="text-xs text-primary mb-2 text-center">Ahora</div>
            <div className="bg-primary/10 rounded-xl p-3 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <BaulIcon className="w-4 h-4 text-primary" />
                <div className="h-2 bg-primary/40 rounded w-20" />
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="aspect-square bg-primary/20 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Todo vive dentro de un Baúl',
      description: 'Un Baúl es tu espacio compartido. Dentro organizas momentos en Capítulos.',
      icon: Folder,
      visual: (
        <div className="bg-muted/30 rounded-2xl p-6">
          {/* Baúl contenedor */}
          <div className="bg-card border-2 border-primary/30 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-4">
              <BaulIcon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Familia García</span>
            </div>

            {/* Capítulos dentro */}
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
                <Folder className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-foreground">Navidad 2023</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
                <Folder className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-foreground">Viaje a la playa</span>
              </div>
            </div>
          </div>

          {/* Microcopy explicativo */}
          <p className="text-xs text-center text-muted-foreground">
            El Baúl dura años. Los Capítulos organizan momentos.
          </p>
        </div>
      )
    },
    {
      title: 'Cada uno participa a su manera',
      description: null,
      icon: Users,
      visual: (
        <div className="space-y-3">
          {/* Custodio */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">👑</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground mb-1">Custodio</div>
                <div className="text-sm text-muted-foreground">Crea y cuida el Baúl</div>
              </div>
            </div>
          </div>

          {/* Colaborador */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">✏️</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground mb-1">Colaborador</div>
                <div className="text-sm text-muted-foreground">Añade recuerdos</div>
              </div>
            </div>
          </div>

          {/* Administrador */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">👑</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground mb-1">Administrador</div>
                <div className="text-sm text-muted-foreground">Gestiona el Baúl, igual que el Custodio</div>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            Sin configuraciones complejas
          </p>
        </div>
      )
    },
    {
      title: 'Este Baúl ya es tuyo',
      description: `Has sido invitado a formar parte de "${baulNombre}". Empieza a añadir y revivir recuerdos.`,
      icon: BaulIcon,
      visual: (
        <div className="flex justify-center">
          <div className="w-32 h-32 bg-primary/10 rounded-3xl flex items-center justify-center">
            <BaulIcon className="w-16 h-16 text-primary" />
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header con skip */}
      <div className="flex justify-end px-6 pt-6">
        <button
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          Saltar
        </button>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="max-w-md w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Icono */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>
              </div>

              {/* Título */}
              <h1 className="text-2xl text-center mb-3 text-foreground">
                {currentStepData.title}
              </h1>

              {/* Descripción */}
              {currentStepData.description && (
                <p className="text-center text-muted-foreground mb-8">
                  {currentStepData.description}
                </p>
              )}

              {/* Visual */}
              <div className="mb-8">
                {currentStepData.visual}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Indicadores de progreso */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-primary'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Botones de navegación */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="px-6 py-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                Atrás
              </button>
            )}

            <Button
              variant="primary"
              fullWidth
              onClick={handleNext}
            >
              {isLastStep ? 'Entrar al Baúl' : 'Continuar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
