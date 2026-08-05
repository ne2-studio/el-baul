import React, { useState } from 'react';
import { useElementHeight } from '@/hooks/useElementHeight';
import { Card } from '@/design-system/components/data-display/Card';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { ExpandableFAB } from '@/design-system/components/actions/FAB';
import { Hero } from '@/design-system/layouts/Hero';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PersonasTabContainer } from '@/features/people/containers/PersonasTabContainer';
import { RecuerdosTabContainer } from '@/features/memories/containers/RecuerdosTabContainer';
import { BaulSettingsMenuContainer } from '@/features/baules/containers/BaulSettingsMenuContainer';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { Plus, Upload, BookImage } from 'lucide-react';
import { Baul, Chapter } from '@/types';
import { BaulPermissions, getBaulPermissions } from '@/utils/roleUtils';
import { makeLooseChapterView } from '@/features/baules/components/looseChapterView';
import { ChapterCard } from '@/features/baules/components/ChapterCard';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';

interface LoosePhoto {
  id: string;
  thumbnailUrl: string;
}


interface ChaptersViewProps {
  baul: Baul;
  chapters: Chapter[];
  loosePhotos?: LoosePhoto[];
  /** Solo para el badge de recuento del Tabbar — los datos completos los leen
   * PersonasTabContainer/RecuerdosTabContainer directamente del store. */
  personasCount?: number;
  recuerdosCount?: number;
  baulPermissions?: BaulPermissions;
  initialTab?: 'capitulos' | 'personas' | 'recuerdos';
  onBack: () => void;
  onSelectChapter: (chapter: Chapter) => void;
  onCreateChapter: () => void;
  onOpenLoosePhotos?: () => void;
  onUploadPhotos?: () => void;
  onOpenChapterFromRecuerdo?: (chapterId: string) => void;
}

export function ChaptersView({
  baul,
  chapters,
  loosePhotos = [],
  personasCount = 0,
  recuerdosCount = 0,
  baulPermissions = getBaulPermissions(baul),
  initialTab = 'capitulos',
  onBack,
  onSelectChapter,
  onCreateChapter,
  onOpenLoosePhotos,
  onUploadPhotos,
  onOpenChapterFromRecuerdo,
}: ChaptersViewProps) {
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const [activeTab, setActiveTab] = useState<'capitulos' | 'personas' | 'recuerdos'>(initialTab);
  const looseChapter = makeLooseChapterView(loosePhotos);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
        variant="row"
        onBack={onBack}
        trailing={<BaulSettingsMenuContainer baul={baul} />}
      />

      <Hero imageUrl={baul.coverPhotoUrl} title={baul.name}>
        {baul.description && (
          <p className="text-sm text-white/80 mt-1.5 leading-snug max-w-sm">{baul.description}</p>
        )}
        {!baul.description && baulPermissions.canEditBaul && (
          <p className="text-sm text-white/40 mt-1.5 italic">Sin descripción · edita desde el menú ···</p>
        )}
      </Hero>

      {/* top es la altura medida del header, no un valor fijo — iOS/WKWebView y
          Android/Chrome WebView renderizan el mismo header a alturas ligeramente distintas. */}
      <Tabbar
        tabs={[
          { key: 'capitulos', label: 'Capítulos', count: chapters.length },
          { key: 'recuerdos', label: 'Recuerdos', count: recuerdosCount },
          { key: 'personas', label: 'Personas', count: personasCount },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as 'capitulos' | 'personas' | 'recuerdos')}
        top={headerHeight}
      >
        <PageContainer className="py-6 pb-28">
          {activeTab === 'capitulos' && (
          chapters.length === 0 && loosePhotos.length === 0 ? (
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
              {chapters.length > 0 && (() => {
                const groups = new Map<string, Chapter[]>();
                for (const chapter of chapters) {
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

              {/* Fotos sueltas — capítulo virtual */}
              {looseChapter && (
                <div>
                  <SwimlaneLabel>Otras</SwimlaneLabel>
                  <Card onClick={onOpenLoosePhotos} className="!p-0 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
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
          )
          )}

          {activeTab === 'personas' && (
            <PersonasTabContainer baulId={baul.id} canCreatePersona={baulPermissions.canCreatePersona} />
          )}

          {activeTab === 'recuerdos' && (
            <RecuerdosTabContainer
              baulId={baul.id}
              baulName={baul.name}
              onOpenChapter={onOpenChapterFromRecuerdo}
            />
          )}
        </PageContainer>
      </Tabbar>

      {activeTab === 'capitulos' && (
        <ExpandableFAB
          actions={[
            {
              label: 'Nuevo capítulo',
              icon: <Plus className="w-4 h-4" />,
              onClick: onCreateChapter,
            },
            ...(onUploadPhotos ? [{
              label: 'Subir fotos',
              icon: <Upload className="w-4 h-4" />,
              onClick: onUploadPhotos,
            }] : []),
          ]}
        />
      )}
    </div>
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
