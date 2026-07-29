import * as React from 'react';
import { useState } from 'react';
import * as S from "@ds-stories/src/features/photos/components/UploadConfirmationScreen.stories";
import { UploadConfirmationScreen } from '@/features/photos/components/UploadConfirmationScreen';
import { Button } from '@/design-system/components/actions/Button';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { StickyHeader } from '@/design-system/layouts/StickyHeader';
import { ChapterSelector, ChapterSelection } from '@/features/chapters/components/ChapterSelector';

function compose(S: any, key: string) {
  const meta: any = S.default ?? {};
  const st: any = S[key];
  const args: any = { ...(meta.args ?? {}), ...(st && st.args ? st.args : {}) };
  // Storybook resolves argTypes.mapping (control value -> real arg) before
  // rendering; mirror that so mapped args don't render raw.
  const at: any = { ...(meta.argTypes ?? {}), ...(st && st.argTypes ? st.argTypes : {}) };
  for (const k of Object.keys(args)) {
    const m = at[k] && at[k].mapping;
    if (m && typeof m === 'object' && args[k] in m) args[k] = m[args[k]];
  }
  return args;
}

// Both stories' TRUE rendered state (what the storybook reference screenshot
// shows) is produced by their `play` function, not their raw `args` — the
// compiled-preview harness never runs `play`. Mirror each story's END state
// instead of the pre-play mount.

// IntoOpenChapter's play hovers/removes photo[0] then clicks "Guardar
// recuerdos" (still showing the post-removal 2-photo state — onUpload is a
// mock, it doesn't unmount anything). `selectedPhotos` is read once into
// UploadConfirmationScreen's own `useState`, so passing the already-reduced
// array through the real component reaches the identical end state (2 fotos
// seleccionadas, photos 2 & 3) without touching component internals.
export const IntoOpenChapter = function Render() {
  const args = compose(S, 'IntoOpenChapter');
  return (
    <UploadConfirmationScreen
      {...args}
      selectedPhotos={args.selectedPhotos.slice(1)}
    />
  );
};

// ChoosingChapter's play clicks "Crear un capítulo nuevo", types "Cumpleaños
// de Carmen" into the name field, then clicks "Guardar recuerdos" (enabled).
// The `chapter` selection is UploadConfirmationScreen's own internal
// useState, seeded only from `currentChapterId` at mount — there's no prop
// to seed it directly. Mirroring the screen's own JSX with the real
// subcomponents (ChapterSelector is controlled via value/onChange) and
// seeding local state to the same end value reaches the identical rendered
// output through the real components, not a hardcoded snapshot.
export const ChoosingChapter = function Render() {
  const args = compose(S, 'ChoosingChapter');
  const { baul, currentChapter, existingChapters, selectedPhotos, onBack, onUpload } = args;
  const [photos] = useState(selectedPhotos);
  const [chapter, setChapter] = useState<ChapterSelection | null>({ type: 'new', name: 'Cumpleaños de Carmen' });
  const canConfirm = chapter !== null && (chapter.type !== 'new' || chapter.name.trim().length > 0);
  const handleConfirm = () => {
    if (!canConfirm || !chapter) return;
    onUpload(photos, chapter, null);
  };
  return (
    <div className="min-h-screen bg-background">
      <StickyHeader>
        <PageContainer className="py-5">
          <Button variant="plain"
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <Icon icon={icons.chevronLeft} size="sm" aria-hidden />
            <span className="text-sm">Volver</span>
          </Button>
          <h1 className="text-3xl text-foreground mb-1">Añadir fotos al capítulo</h1>
          <p className="text-sm text-muted-foreground">{currentChapter.name}</p>
        </PageContainer>
      </StickyHeader>

      <PageContainer className="py-6">
        <div className="mb-6">
          <p className="text-center text-muted-foreground">
            {photos.length} {photos.length === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {photos.map((photo: any) => (
            <div key={photo.id} className="relative aspect-square group">
              <img
                src={photo.preview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg"
              />
              <Button variant="plain"
                onClick={() => {}}
                aria-label="Quitar foto"
                className="absolute -top-2 -right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icon icon={icons.close} size="sm" aria-hidden />
              </Button>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-medium text-foreground mb-3">Capítulo</h2>
          <ChapterSelector
            chapters={existingChapters}
            currentChapterId={undefined}
            value={chapter}
            onChange={setChapter}
          />
        </div>

        <div className="space-y-3">
          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Guardar recuerdos
          </Button>
          <Button variant="ghost" fullWidth onClick={onBack}>
            Cancelar
          </Button>
        </div>
      </PageContainer>
    </div>
  );
};
