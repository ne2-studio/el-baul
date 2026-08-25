import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/design-system/components/data-display/Card';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';
import { CreateChapterModal } from '@/features/chapters/components/CreateChapterModal';
import { Plus, BookImage } from 'lucide-react';
import { ChapterCard } from '@/features/baules/components/ChapterCard';
import { makeLooseChapterView } from '@/features/baules/components/looseChapterView';
import { Chapter } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { createChapter } from '@/features/chapters/useCases';

interface BaulChaptersTabContainerProps {
  baulId: string;
  // Compartido con BaulFeedTabContainer's onOpenChapter — solo navega, la carga de fotos y
  // recuerdos del capítulo la gestiona ChapterRoute (useChapterScope) tras la navegación — se
  // queda como callback de BaulRoute en vez de duplicarse aquí — ver la regla de containers/
  // en docs/architecture/frontend.md.
  onSelectChapter: (chapter: Chapter) => void;
}

// Self-sufficient tab: lee chapters/loosePhotos él mismo y posee la creación de capítulos y
// la navegación a "subir fotos"/"fotos sueltas" de punta a punta.
export function BaulChaptersTabContainer({ baulId, onSelectChapter }: BaulChaptersTabContainerProps) {
  const navigate = useNavigate();
  const { chapters, loosePhotos } = useBaulesStore();
  const photosById = usePhotosStore((state) => state.photosById);
  const { run, isPending } = useAsyncAction();
  const [showCreateChapterModal, setShowCreateChapterModal] = useState(false);

  const baulChapters = chapters[baulId] || [];
  const baulLoosePhotos = hydratePhotos(loosePhotos[baulId], photosById) || [];
  const looseChapter = makeLooseChapterView(baulLoosePhotos);

  const handleCreateChapter = async (name: string) => {
    const result = await run(() => createChapter(baulId, name), {
      key: 'create-chapter',
      successMessage: 'Capítulo creado',
      errorMessage: 'Error al crear el capítulo',
    });
    if (result.ok) {
      setShowCreateChapterModal(false);
      onSelectChapter(result.value);
    }
  };

  return (
    <>
      {baulChapters.length === 0 && baulLoosePhotos.length === 0 ? (
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
          {baulChapters.length > 0 && (() => {
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

          {/* Fotos sueltas — capítulo virtual */}
          {looseChapter && (
            <div>
              <SwimlaneLabel>Otras</SwimlaneLabel>
              <Card
                onClick={() => navigate(`/baules/${baulId}/fotos-sueltas`)}
                className="!p-0 overflow-hidden opacity-80 hover:opacity-100 transition-opacity"
              >
                {/* Collage cover */}
                <div className="aspect-[16/10] bg-secondary relative rounded-t-2xl overflow-hidden">
                  <FotosSueltasCollage coverPhotos={looseChapter.coverPhotoUrls} />
                </div>
                <div className="p-4 bg-card">
                  <h3 className="font-medium text-lg text-foreground">{looseChapter.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {looseChapter.photoCount} {looseChapter.photoCount === 1 ? 'foto que aún no pertenece' : 'fotos que aún no pertenecen'} a ningún capítulo
                  </p>
                </div>
              </Card>
            </div>
          )}
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

// Collage for the "Fotos sueltas" virtual chapter cover
const COLLAGE_COLORS = [
  '#D4B89A', '#C4A882', '#B89870', '#E8D5C0', '#C8B090', '#D8C0A0', '#BCA878', '#E0CCAA', '#CAB088',
];

function FotosSueltasCollage({ coverPhotos }: { coverPhotos: string[] }) {
  const cells = Array.from({ length: 9 }, (_, i) => coverPhotos[i] ?? null);
  return (
    <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-px">
      {cells.map((url, i) => (
        <div key={i} className="relative overflow-hidden" style={{ backgroundColor: COLLAGE_COLORS[i % COLLAGE_COLORS.length] }}>
          {url && <img src={url} alt="" className="w-full h-full object-cover opacity-90" />}
        </div>
      ))}
    </div>
  );
}
