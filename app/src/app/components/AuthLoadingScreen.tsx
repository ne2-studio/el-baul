import React from 'react';
import { Archive } from 'lucide-react';

export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* App Icon with animation */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-lg animate-pulse">
            <Archive className="w-12 h-12 text-primary-foreground" strokeWidth={1.5} />
          </div>
        </div>
        
        {/* Loading text */}
        <p className="text-lg text-muted-foreground">
          Preparando tu baúl…
        </p>
      </div>
    </div>
  );
}
