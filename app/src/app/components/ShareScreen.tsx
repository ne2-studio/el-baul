import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { ChevronLeft, Share2 } from 'lucide-react';

interface ShareScreenProps {
  itemName: string;
  itemType: 'baúl' | 'álbum';
  onBack: () => void;
  onShare: (email: string) => void;
}

export function ShareScreen({ itemName, itemType, onBack, onShare }: ShareScreenProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onShare(email);
      setSent(true);
      setTimeout(() => {
        setEmail('');
        setSent(false);
      }, 2000);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Volver</span>
          </button>
          <h1 className="text-3xl text-foreground">Compartir</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl mb-2 text-foreground">
            Compartir "{itemName}"
          </h3>
          <p className="text-muted-foreground">
            Las personas que invites podrán ver este {itemType}, pero no modificarlo.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="nombre@ejemplo.com"
            value={email}
            onChange={setEmail}
          />
          
          <Button 
            type="submit" 
            variant="primary" 
            fullWidth
          >
            {sent ? '¡Invitación enviada!' : 'Enviar invitación'}
          </Button>
        </form>
      </div>
    </div>
  );
}
