import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/design-system/components/actions/Button';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { ExpandableFAB } from '@/design-system/components/actions/FAB';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';
import { CreateChapterModal } from '@/features/chapters/components/CreateChapterModal';
import { Plus, Upload, BookImage } from 'lucide-react';
import { ChapterCard } from '@/features/baules/components/ChapterCard';
import { makeLooseChapterView } from '@/features/baules/components/looseChapterView';
import { Chapter } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { createChapter } from '@/features/chapters/useCases';

interface BaulChaptersTabContainerProps {
  baulId: string;
  // Compartido con BaulRecuerdosTabContainer's onOpenChapter y con el overlay de pantalla
  // completa "Cargando fotos..." que dispara — se queda como callback de BaulRoute en vez de
  // duplicarse aquí — ver la regla de containers/ en docs/architecture/frontend.md.
  onSelectChapter: (chapter: Chapter) => void;
}

// Self-sufficient tab: lee chapters/loosePhotos él mismo y posee la creación de capítulos y
// la navegación a "subir fotos"/"fotos sueltas" de punta a punta.
export function BaulChaptersTabContainer({ baulId, onSelectChapter }: BaulChaptersTabContainerProps) {
  const navigate = useNavigate();
  const { chapters, loosePhotos } = useBaulesStore();
  const { run, isPending } = useAsyncAction();
  const [showCreateChapterModal, setShowCreateChapterModal] = useState(false);

  const baulChapters = chapters[baulId] || [];
  const baulLoosePhotos = loosePhotos[baulId] || [];
  const looseChapter = makeLooseChapterView(baulLoosePhotos);

  const handleCreateChapter = async (name: string) => {
    const result = await run(() => createChapter(baulId, name), {
      key: 'create-chapter',
      errorMessage: 'Error al crear el capítulo',
    });
    if (result.ok) setShowCreateChapterModal(false);
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {yearChapters.map((chapter) => (
                        <ChapterCard key={chapter.id} chapter={chapter} onClick={() => onSelectChapter(chapter)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Fotos sueltas — capítulo virtual, mismo lenguaje visual (overlay + título sobre
              la imagen) que ChapterCard, para que el grid se vea consistente. */}
          {looseChapter && (
            <div>
              <SwimlaneLabel>Otras</SwimlaneLabel>
              <Button variant="plain"
                onClick={() => navigate(`/baules/${baulId}/fotos-sueltas`)}
                className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden text-left shadow-sm opacity-80 hover:opacity-100 active:scale-[0.98] transition-all"
              >
                <div className="absolute inset-0 bg-secondary">
                  <FotosSueltasCollage coverPhotos={looseChapter.coverPhotoUrls} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-serif text-white text-lg leading-tight drop-shadow">{looseChapter.name}</h3>
                  <p className="text-white/85 text-xs mt-0.5 drop-shadow-sm">
                    {looseChapter.photoCount} {looseChapter.photoCount === 1 ? 'foto que aún no pertenece' : 'fotos que aún no pertenecen'} a ningún capítulo
                  </p>
                </div>
              </Button>
            </div>
          )}
        </div>
      )}

      <ExpandableFAB
        actions={[
          {
            label: 'Nuevo capítulo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => setShowCreateChapterModal(true),
          },
          {
            label: 'Subir fotos',
            icon: <Upload className="w-4 h-4" />,
            onClick: () => navigate(`/baules/${baulId}/fotos-sueltas/confirmar`),
          },
        ]}
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
