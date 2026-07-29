import React from 'react';
import { BookOpen, Bug, Lightbulb, MessageCircle, ExternalLink } from 'lucide-react';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { Button } from '@/design-system/components/actions/Button';

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
      <PageHeader variant="inline" onBack={onBack} title="Ayuda y soporte" />

      {/* Content */}
      <PageContainer className="py-8 space-y-3">
        <Button variant="plain"
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
        </Button>

        <Button variant="plain"
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
        </Button>

        <Button variant="plain"
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
        </Button>

        <Button variant="plain"
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
        </Button>
      </PageContainer>
    </div>
  );
}
