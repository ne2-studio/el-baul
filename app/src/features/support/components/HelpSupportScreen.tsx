import { BookOpen, Bug, Lightbulb, MessageCircle, ExternalLink } from 'lucide-react';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { ActionListItem } from '@/design-system/components/data-display/ActionListItem';

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
        <ActionListItem
          onClick={onOpenHelpCenter}
          variant="card"
          icon={<BookOpen className="w-5 h-5" />}
          title="Centro de ayuda"
          description="Preguntas frecuentes y guías"
          trailing={<ExternalLink className="w-4 h-4" />}
        />

        <ActionListItem
          onClick={onReportBug}
          variant="card"
          icon={<Bug className="w-5 h-5" />}
          title="Informar de un problema"
          description="Algo no ha funcionado como esperabas"
        />

        <ActionListItem
          onClick={onSendSuggestion}
          variant="card"
          icon={<Lightbulb className="w-5 h-5" />}
          title="Enviar una sugerencia"
          description="Cuéntanos qué te gustaría ver"
        />

        <ActionListItem
          onClick={onContactSupport}
          variant="card"
          icon={<MessageCircle className="w-5 h-5" />}
          title="Hablar con soporte"
          description="Escríbenos y te responderemos"
        />
      </PageContainer>
    </div>
  );
}
