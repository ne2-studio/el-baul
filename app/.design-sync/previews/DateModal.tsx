import * as React from 'react';
import { useState } from 'react';
import * as S from "@ds-stories/src/design-system/patterns/forms/DateModal.stories";
import { PartialDatePicker } from '@/design-system/components/forms/PartialDatePicker';
import { Button } from '@/design-system/components/actions/Button';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { PhotoDate } from '@/types';

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
  const title: string = typeof meta.title === 'string' ? meta.title : '';
  const ctx: any = {
    args, name: key, title, kind: title, id: '', componentId: '',
    globals: {}, viewMode: 'story',
    parameters: (st && st.parameters) ?? meta.parameters ?? {},
  };
  let render: (() => any) | null = null;
  if (st && typeof st.render === 'function') render = () => st.render(args, ctx);
  else if (typeof st === 'function') render = () => st(args, ctx);
  else if (typeof meta.render === 'function') render = () => meta.render(args, ctx);
  else {
    const C = (st && st.component) || meta.component;
    if (C) render = () => React.createElement(C, args);
  }
  if (!render) return () => null;
  // [].concat: a single function is legal CSF decorator shorthand. A
  // decorator returning undefined (stubbed addon) falls through to the inner
  // render — otherwise one unrecognized addon blanks the cell silently.
  const decorators: any[] = ([] as any[]).concat((st && st.decorators) ?? []).concat(meta.decorators ?? []);
  return decorators.reduce((inner: any, dec: any) => () => {
    const out = dec(inner, ctx);
    return out === undefined ? inner() : out;
  }, render);
}

// The story's `Default` export renders a blank DateModal — its `play`
// function then types "2024" into the year field and selects month "Jul",
// which is the state the real storybook screenshot shows (play() runs
// automatically there). The compiled-preview harness never runs `play`, so
// composing the story as-is renders the blank pre-play state instead.
// DateModal itself doesn't expose a seeding prop (it mounts
// PartialDatePicker uncontrolled, only wiring its onChange), but
// PartialDatePicker does — `initialValue`, read once on mount and reported
// up through the same onChange DateModal itself relies on. Mirroring
// DateModal's own JSX exactly and passing that seed reaches the identical
// end state (year/month filled in, Confirmar enabled) through the real
// components, not a hardcoded snapshot.
export const Default = function Render() {
  const [pending, setPending] = useState<PhotoDate | null>(null);
  return (
    <BottomSheetModal onCancel={() => {}} backdropOpacity={40}>
      <h2 className="text-lg font-medium text-foreground mb-5">Cambiar fecha de la foto</h2>
      <div className="mb-6">
        <PartialDatePicker
          initialValue={{ year: 2024, month: 7 }}
          onChange={(v) => setPending(v)}
        />
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => {}} className="flex-1 text-sm">
          Cancelar
        </Button>
        <Button onClick={() => {}} disabled={!pending?.year} className="flex-1 text-sm">
          Confirmar
        </Button>
      </div>
    </BottomSheetModal>
  );
};
export const Submitting = /* Submitting */ compose(S, "Submitting");
