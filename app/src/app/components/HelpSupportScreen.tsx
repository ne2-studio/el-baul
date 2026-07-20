import React from 'react';
import { ChevronLeft, BookOpen, Bug, Lightbulb, MessageCircle, ExternalLink } from 'lucide-react';

interface HelpSupportScreenProps {
  onBack: () => void;
  onOpenHelpCenter: () => void;
  onReportBug: () => void;
  onSendSuggestion: () => void;
  onContactSupport: () => void;
}

export function HelpSupportScreen({
  onBack,
  onOpenHelpCenter,
  onReportBug,
  onSendSuggestion,
  onContactSupport,
}: HelpSupportScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-3xl text-foreground">Ayuda y soporte</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-3">
        <button
          onClick={onOpenHelpCenter}
          className="w-full flex items-center gap-4 px-4 py-4 bg-card border border-border rounded-2xl hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-foreground">Centro de ayuda</div>
            <div className="text-sm text-muted-foreground">Preguntas frecuentes y guías</div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>

        <button
          onClick={onReportBug}
          className="w-full flex items-center gap-4 px-4 py-4 bg-card border border-border rounded-2xl hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bug className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-foreground">Informar de un problema</div>
            <div className="text-sm text-muted-foreground">Algo no ha funcionado como esperabas</div>
          </div>
        </button>

        <button
          onClick={onSendSuggestion}
          className="w-full flex items-center gap-4 px-4 py-4 bg-card border border-border rounded-2xl hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-foreground">Enviar una sugerencia</div>
            <div className="text-sm text-muted-foreground">Cuéntanos qué te gustaría ver</div>
          </div>
        </button>

        <button
          onClick={onContactSupport}
          className="w-full flex items-center gap-4 px-4 py-4 bg-card border border-border rounded-2xl hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-foreground">Hablar con soporte</div>
            <div className="text-sm text-muted-foreground">Escríbenos y te responderemos</div>
          </div>
        </button>
      </div>
    </div>
  );
}
