import React, { useState } from 'react';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';
import { CreateChapterModal } from '@/features/chapters/components/CreateChapterModal';
import { Plus, BookImage } from 'lucide-react';
import { ChapterCard } from '@/features/baules/components/ChapterCard';
import { Chapter } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { createChapter } from '@/features/chapters/useCases';
import { usePostHog } from 'posthog-js/react';

interface BaulChaptersTabContainerProps {
  baulId: string;
  // Compartido con BaulFeedTabContainer's onOpenChapter — solo navega, la carga de fotos y
  // recuerdos del capítulo la gestiona ChapterRoute (useChapterScope) tras la navegación — se
  // queda como callback de BaulRoute en vez de duplicarse aquí — ver la regla de containers/
  // en docs/architecture/frontend.md.
  onSelectChapter: (chapter: Chapter) => void;
}

// Self-sufficient tab: lee chapters él mismo y posee la creación de capítulos de punta a
// punta. Las fotos sin capítulo ya no tienen aquí una card propia — viven en el filtro "Sin
// capítulo" de la pestaña "Fotos" del baúl (BaulPhotosTabContainer), que sustituye por
// completo al antiguo capítulo virtual "Fotos sueltas".
export function BaulChaptersTabContainer({ baulId, onSelectChapter }: BaulChaptersTabContainerProps) {
  const { chapters } = useBaulesStore();
  const { run, isPending } = useAsyncAction();
  const posthog = usePostHog();
  const [showCreateChapterModal, setShowCreateChapterModal] = useState(false);

  const baulChapters = chapters[baulId] || [];

  const handleCreateChapter = async (name: string) => {
    const result = await run(() => createChapter(baulId, name), {
      key: 'create-chapter',
      successMessage: 'Capítulo creado',
      errorMessage: 'Error al crear el capítulo',
    });
    if (result.ok) {
      posthog.capture('chapter_created', { source: 'chapters_tab' });
      setShowCreateChapterModal(false);
      onSelectChapter(result.value);
    }
  };

  return (
    <>
      {baulChapters.length === 0 ? (
        <EmptyState
          icon={<BookImage className="w-20 h-20" strokeWidth={1.5} />}
          title="Este baúl está vacío"
          subtitle="Crea tu primer capítulo para empezar a guardar recuerdos"
        />
      ) : (
        <div className="space-y-6">
          {/* Todos los capítulos, agrupados por año de la fecha mínima (ya vienen
              ordenados del backend por fecha mínima ascendente, así que agrupar
              consecutivamente preserva ese orden dentro y entre swimlanes) */}
          {(() => {
            const groups = new Map<string, Chapter[]>();
            for (const chapter of baulChapters) {
              const year = chapter.minDate ? String(chapter.minDate.year) : 'Sin año';
              if (!groups.has(year)) groups.set(year, []);
              groups.get(year)!.push(chapter);
            }

            return (
              <div className="space-y-6">
                {Array.from(groups.entries()).map(([year, yearChapters]) => (
                  <div key={year}>
                    <SwimlaneLabel>{year}</SwimlaneLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {yearChapters.map((chapter) => (
                        <ChapterCard key={chapter.id} chapter={chapter} onClick={() => onSelectChapter(chapter)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* "Subir fotos" ya no vive aquí — la pestaña "Fotos" del baúl (BaulPhotosTabContainer)
          es ahora el único punto de entrada para subir fotos sueltas, así que este FAB vuelve
          a ser una única acción — ver el hallazgo de refinamiento del issue #57. */}
      <SimpleFAB
        label="Nuevo capítulo"
        icon={<Plus className="w-5 h-5" />}
        onClick={() => setShowCreateChapterModal(true)}
      />

      {showCreateChapterModal && (
        <CreateChapterModal
          onCancel={() => setShowCreateChapterModal(false)}
          onSave={handleCreateChapter}
          isSubmitting={isPending('create-chapter')}
        />
      )}
    </>
  );
}
