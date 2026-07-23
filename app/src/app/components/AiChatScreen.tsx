import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Send, Sparkles } from 'lucide-react';
import { ChatMessage } from '@/types';

interface AiChatScreenProps {
  messages: ChatMessage[];
  isLoadingHistory: boolean;
  isSending: boolean;
  hasError: boolean;
  onBack: () => void;
  onSend: (text: string) => void;
}

const SUGGESTIONS = [
  '¿Qué fotos tenemos de la boda?',
  '¿Qué sabemos sobre el abuelo Antonio?',
  '¿Cuándo fue nuestro viaje a Asturias?',
  'Ayúdame a escribir un recuerdo.',
];

export function AiChatScreen({ messages, isLoadingHistory, isSending, hasError, onBack, onSend }: AiChatScreenProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isSending]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setInput('');
    onSend(trimmed);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-2xl text-foreground">Ayúdame a recordar</h1>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-6">
        {!isLoadingHistory && messages.length === 0 && (
          <div className="mb-8">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-center text-muted-foreground mb-6">
              Pregúntame lo que quieras sobre la historia de tu familia.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="text-left text-sm px-4 py-3 bg-card border border-border rounded-xl hover:bg-muted transition-colors text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-foreground'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-card border border-border text-muted-foreground">
                Escribiendo...
              </div>
            </div>
          )}

          {hasError && (
            <p className="text-sm text-destructive text-center mt-2">
              No hemos podido obtener una respuesta. Inténtalo de nuevo.
            </p>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(input);
            }}
            placeholder="Escribe tu pregunta..."
            disabled={isSending}
            className="flex-1 px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isSending}
            className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-opacity flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
