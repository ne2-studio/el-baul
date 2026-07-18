import React, { useState } from 'react';
import { Button } from './Button';
import { BookImage, Users } from 'lucide-react';
import { BaulIcon } from './BaulIcon';

interface OnboardingSlide {
  title: string;
  text: string;
  icon: React.ReactNode;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides: OnboardingSlide[] = [
    {
      title: "Tus recuerdos, a salvo",
      text: "Un espacio privado para guardar fotos que no quieres perder.",
      icon: <BaulIcon className="w-16 h-16 text-primary" />
    },
    {
      title: "Organizados por historias",
      text: "Crea álbumes para viajes, celebraciones o etapas de tu vida.",
      icon: <BookImage className="w-16 h-16 text-primary" strokeWidth={1.5} />
    },
    {
      title: "Solo para quien tú decidas",
      text: "Comparte tu baúl o álbumes con personas concretas.",
      icon: <Users className="w-16 h-16 text-primary" strokeWidth={1.5} />
    }
  ];
  
  const isLastSlide = currentSlide === slides.length - 1;
  
  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };
  
  const handleSkip = () => {
    onComplete();
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button 
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Saltar
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="mb-8 flex justify-center">
            {slides[currentSlide].icon}
          </div>
          
          {/* Title */}
          <h2 className="text-3xl mb-4 text-foreground">
            {slides[currentSlide].title}
          </h2>
          
          {/* Text */}
          <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
            {slides[currentSlide].text}
          </p>
          
          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mb-8">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'w-8 bg-primary' 
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
          
          {/* CTA */}
          <Button variant="primary" fullWidth onClick={handleNext}>
            {isLastSlide ? 'Crear mi primer baúl' : 'Siguiente'}
          </Button>
        </div>
      </div>
    </div>
  );
}
