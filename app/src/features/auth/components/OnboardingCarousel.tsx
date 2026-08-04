import React, { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { HardDrive, Image as ImageIcon, MessageCircle, Smartphone, Users, Video } from 'lucide-react';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingCarouselLastStep {
  title: string;
  description: string | null;
  ctaLabel: string;
}

interface OnboardingCarouselProps {
  lastStep: OnboardingCarouselLastStep;
  onComplete: () => void;
  onSkip: () => void;
}

function ScatteredMemoriesIllustration() {
  const scattered = [
    { Icon: MessageCircle, x: -64, y: -40 },
    { Icon: ImageIcon, x: 64, y: -40 },
    { Icon: HardDrive, x: -64, y: 40 },
    { Icon: Smartphone, x: 64, y: 40 },
  ];

  return (
    <div className="relative h-40 flex items-center justify-center">
      {scattered.map(({ Icon, x, y }, i) => (
        <motion.div
          key={i}
          className="absolute w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"
          initial={{ x, y, opacity: 0.9 }}
          animate={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
          transition={{ duration: 1.6, delay: 0.4, ease: 'easeInOut' }}
        >
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </motion.div>
      ))}
      <motion.div
        className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
        initial={{ scale: 0.8, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <BaulIcon className="w-8 h-8 text-primary" />
      </motion.div>
    </div>
  );
}

function SharedSpaceIllustration() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground/70"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
          >
            <Users className="w-5 h-5" strokeWidth={1.5} />
          </motion.div>
        ))}
      </div>
      <motion.div
        className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
        initial={{ scale: 0.9, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <BaulIcon className="w-8 h-8 text-primary" />
      </motion.div>
    </div>
  );
}

function GrowingMemoryIllustration() {
  const items = [
    { Icon: ImageIcon, x: -60, y: -46 },
    { Icon: Video, x: 60, y: -46 },
    { Icon: MessageCircle, x: -60, y: 46 },
    { Icon: Users, x: 60, y: 46 },
  ];

  return (
    <div className="relative h-40 flex items-center justify-center">
      {items.map(({ Icon, x, y }, i) => (
        <motion.div
          key={i}
          className="absolute w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
          style={{ left: `calc(50% + ${x}px - 1.125rem)`, top: `calc(50% + ${y}px - 1.125rem)` }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 + i * 0.2 }}
        >
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </motion.div>
      ))}
      <motion.div
        className="w-16 h-16 rounded-2xl bg-card border border-primary/20 flex items-center justify-center z-10"
        initial={{ scale: 0.85 }}
        animate={{ scale: [0.85, 1, 1.06, 1] }}
        transition={{ duration: 1.4, delay: 0.3, times: [0, 0.3, 0.7, 1] }}
      >
        <BaulIcon className="w-8 h-8 text-primary" />
      </motion.div>
    </div>
  );
}

function TrunkReadyIllustration() {
  return (
    <div className="flex justify-center">
      <motion.div
        className="w-32 h-32 bg-primary/10 rounded-3xl flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <BaulIcon className="w-16 h-16 text-primary" />
      </motion.div>
    </div>
  );
}

export function OnboardingCarousel({
  lastStep,
  onComplete,
  onSkip
}: OnboardingCarouselProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Los recuerdos importantes acaban perdiéndose',
      description: 'Fotos en WhatsApp, vídeos en móviles antiguos, historias que solo recuerda una persona.',
      illustration: <ScatteredMemoriesIllustration />
    },
    {
      title: 'Por eso existe un Baúl',
      description: 'Un espacio compartido y seguro donde toda la familia guarda fotos, vídeos y recuerdos en un mismo lugar.',
      illustration: <SharedSpaceIllustration />
    },
    {
      title: 'Cada recuerdo hace crecer la historia',
      description: 'Cada uno añade sus fotos, vídeos y recuerdos. Así, el Baúl se convierte en la memoria de toda la familia.',
      illustration: <GrowingMemoryIllustration />
    },
    {
      title: lastStep.title,
      description: lastStep.description,
      illustration: <TrunkReadyIllustration />
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
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex justify-end px-6 pt-[calc(1.5rem_+_var(--safe-top))] h-12">
        {!isLastStep && (
          <Button variant="plain"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Saltar
          </Button>
        )}
      </div>

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
              <h1 className="text-2xl text-center mb-3 text-foreground">
                {currentStepData.title}
              </h1>

              {currentStepData.description && (
                <p className="text-center text-muted-foreground mb-10">
                  {currentStepData.description}
                </p>
              )}

              <div className="mb-10">
                {currentStepData.illustration}
              </div>
            </motion.div>
          </AnimatePresence>

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

          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button variant="plain"
                onClick={handleBack}
                className="px-6 py-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                Atrás
              </Button>
            )}

            <Button
              variant="primary"
              fullWidth
              onClick={handleNext}
            >
              {isLastStep ? lastStep.ctaLabel : 'Continuar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
