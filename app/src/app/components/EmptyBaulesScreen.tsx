import React from 'react';
import { Button } from './Button';

interface EmptyBaulesScreenProps {
  onCreateFirstBaul: () => void;
}

export function EmptyBaulesScreen({ onCreateFirstBaul }: EmptyBaulesScreenProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Empty trunk illustration */}
        <div className="mb-8 flex justify-center">
          <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Trunk base */}
            <rect x="20" y="50" width="120" height="60" rx="8" fill="#D4A574" opacity="0.3" stroke="#B08968" strokeWidth="2"/>
            {/* Trunk lid */}
            <path d="M20 50 L20 40 Q20 30 30 30 L130 30 Q140 30 140 40 L140 50 Z" fill="#D4A574" opacity="0.4" stroke="#B08968" strokeWidth="2"/>
            {/* Lock */}
            <circle cx="80" cy="65" r="8" fill="#B08968" opacity="0.5"/>
            <rect x="76" y="70" width="8" height="12" rx="2" fill="#B08968" opacity="0.5"/>
            {/* Decorative lines */}
            <line x1="30" y1="60" x2="130" y2="60" stroke="#B08968" strokeWidth="1.5" opacity="0.3"/>
            <line x1="30" y1="90" x2="130" y2="90" stroke="#B08968" strokeWidth="1.5" opacity="0.3"/>
          </svg>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl mb-3 text-foreground">
          Tu baúl empieza aquí
        </h1>
        
        {/* Message */}
        <p className="text-base text-muted-foreground mb-2">
          Todavía no tienes ningún baúl creado
        </p>
        
        {/* Supporting text */}
        <p className="text-sm text-muted-foreground/75 mb-10">
          Crea tu primer baúl para empezar a guardar recuerdos importantes
        </p>
        
        {/* CTA */}
        <Button variant="primary" fullWidth onClick={onCreateFirstBaul}>
          Crear mi primer baúl
        </Button>
      </div>
    </div>
  );
}
