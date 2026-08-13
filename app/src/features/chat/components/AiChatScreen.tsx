import React, { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { ChatMessage } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { ChatBubble } from '@/design-system/components/data-display/ChatBubble';
import { Input } from '@/design-system/components/forms/Input';

interface AiChatScreenProps {
  messages: ChatMessage[];
  isLoadingHistory: boolean;
  isSending: boolean;
  hasError: boolean;
  suggestions: string[];
  isLoadingSuggestions: boolean;
  onBack: () => void;
  onSend: (text: string) => void;
  /** Menú "···" del chat (p. ej. "Gestionar memoria") — omitido cuando no hay nada que mostrar. */
  menu?: React.ReactNode;
}

export function AiChatScreen({
  messages,
  isLoadingHistory,
  isSending,
  hasError,
  suggestions,
  isLoadingSuggestions,
  onBack,
  onSend,
  menu,
}: AiChatScreenProps) {
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
      <PageHeader
        variant="inline"
        onBack={onBack}
        title="Recordemos juntos"
        titleClassName="text-2xl"
        trailing={menu}
      />

      {/* Messages */}
      <PageContainer className="flex-1 w-full py-6">
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
              {isLoadingSuggestions ? (
                <p className="text-center text-sm text-muted-foreground">Pensando en preguntas...</p>
              ) : (
                suggestions.map((suggestion) => (
                  <Button variant="plain"
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    className="text-left text-sm px-4 py-3 bg-card border border-border rounded-xl hover:bg-muted transition-colors text-foreground"
                  >
                    {suggestion}
                  </Button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <ChatBubble key={message.id} role={message.role}>
              {message.content}
            </ChatBubble>
          ))}

          {isSending && (
            <ChatBubble role="assistant" className="text-muted-foreground">
              Escribiendo...
            </ChatBubble>
          )}

          {hasError && (
            <p className="text-sm text-destructive text-center mt-2">
              No hemos podido obtener una respuesta. Inténtalo de nuevo.
            </p>
          )}
        </div>
        <div ref={bottomRef} />
      </PageContainer>

      {/* Input */}
      <div className="sticky bottom-0 pb-safe bg-background/80 backdrop-blur-sm border-t border-border">
        <PageContainer className="py-4 flex items-center gap-3">
          <Input
            type="text"
            value={input}
            onChange={setInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(input);
            }}
            placeholder="Escribe tu pregunta..."
            disabled={isSending}
            className="flex-1"
            inputClassName="bg-card text-foreground placeholder:text-muted-foreground"
          />
          <Button
            variant="primary"
            iconOnly
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isSending}
            className="flex-shrink-0"
            aria-label="Enviar"
          >
            <Send className="w-5 h-5" aria-hidden />
          </Button>
        </PageContainer>
      </div>
    </div>
  );
}
