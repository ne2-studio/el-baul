import React, { useState } from 'react';
import { Brain, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { EditChatMemoryModal } from '@/features/chat/components/EditChatMemoryModal';
import { ChatMemory } from '@/types';

interface ChatMemoriesScreenProps {
  memories: ChatMemory[];
  isLoading: boolean;
  hasError: boolean;
  onBack: () => void;
  onEdit: (memory: ChatMemory, content: string) => Promise<boolean> | boolean;
  onDelete: (memory: ChatMemory) => Promise<boolean> | boolean;
}

// Pantalla "Gestionar memoria": lista simple de lo que el chat recuerda de este usuario en
// este baúl, con editar/eliminar por memoria — deliberadamente sin categorías, tags,
// confidence ni ordenación manual (ver PRD). Sin FAB: las memorias solo se crean por
// extracción automática, nunca a mano desde aquí.
export function ChatMemoriesScreen({ memories, isLoading, hasError, onBack, onEdit, onDelete }: ChatMemoriesScreenProps) {
  const [editingMemory, setEditingMemory] = useState<ChatMemory | null>(null);
  const [deletingMemory, setDeletingMemory] = useState<ChatMemory | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveEdit = async (content: string) => {
    if (!editingMemory) return;
    setIsSavingEdit(true);
    try {
      const ok = await onEdit(editingMemory, content);
      if (ok) setEditingMemory(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMemory) return;
    setIsDeleting(true);
    try {
      const ok = await onDelete(deletingMemory);
      if (ok) setDeletingMemory(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader
        variant="stacked"
        onBack={onBack}
        title="Gestionar memoria"
        subtitle="Lo que recuerdo de tus conversaciones"
      />

      <PageContainer className="flex-1 w-full py-6">
        {isLoading ? (
          <LoadingSpinner message="Cargando tu memoria..." />
        ) : hasError ? (
          <p className="text-sm text-destructive text-center mt-2">
            No hemos podido cargar tu memoria. Inténtalo de nuevo.
          </p>
        ) : memories.length === 0 ? (
          <div className="py-12 text-center max-w-xs mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-primary/60" strokeWidth={1.5} aria-hidden />
            </div>
            <h3 className="text-lg font-serif text-foreground mb-2">Todavía no recuerdo nada</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A medida que converses conmigo, iré recordando información sobre tu familia para
              futuras conversaciones.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {memories.map((memory) => (
              <div key={memory.id} className="rounded-2xl p-5 border bg-card border-border/60">
                <p className="text-sm text-foreground leading-relaxed mb-3">{memory.content}</p>
                <div className="flex items-center gap-1 -mx-2 -mb-2">
                  <Button variant="plain"
                    type="button"
                    onClick={() => setEditingMemory(memory)}
                    className="text-xs px-2 py-1 rounded-full flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
                    Editar
                  </Button>
                  <Button variant="plain"
                    type="button"
                    onClick={() => setDeletingMemory(memory)}
                    className="text-xs px-2 py-1 rounded-full flex items-center gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>

      {editingMemory && (
        <EditChatMemoryModal
          initialContent={editingMemory.content}
          onCancel={() => setEditingMemory(null)}
          onSave={handleSaveEdit}
          isSubmitting={isSavingEdit}
        />
      )}

      {deletingMemory && (
        <ConfirmActionModal
          title="Eliminar memoria"
          description="Esta memoria dejará de utilizarse en futuras conversaciones. ¿Estás seguro?"
          confirmLabel="Sí, eliminar"
          onCancel={() => setDeletingMemory(null)}
          onConfirm={handleConfirmDelete}
          isSubmitting={isDeleting}
        />
      )}
    </div>
  );
}
