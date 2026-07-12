import React, { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { Baul } from './BaulesList';

interface RequestAccessScreenProps {
  baul: Baul;
  onBack: () => void;
  onSubmitRequest: (message: string) => void;
}

export function RequestAccessScreen({ baul, onBack, onSubmitRequest }: RequestAccessScreenProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitRequest(message);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-serif text-gray-900">Solicitar acceso</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        {/* Baul info */}
        <div className="mb-6">
          <h2 className="font-serif text-xl text-gray-900 mb-1">{baul.name}</h2>
          {baul.description && (
            <p className="text-sm text-gray-600">{baul.description}</p>
          )}
        </div>

        {/* Intro text */}
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">
            Puedes pedir acceso al custodio de este baúl.
          </p>
        </div>

        {/* Request form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="message" className="block text-sm text-gray-700 mb-2">
              Mensaje (opcional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe un mensaje (opcional)"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Un mensaje personal puede ayudar al custodio a reconocerte.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-full font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Solicitar acceso
            </button>
            
            <button
              type="button"
              onClick={onBack}
              className="w-full text-gray-600 py-3 px-6 font-medium hover:text-gray-900 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
