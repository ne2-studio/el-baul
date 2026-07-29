import * as React from 'react';
import { useState } from 'react';
import * as S from "@ds-stories/src/design-system/components/forms/PartialDatePicker.stories";
import { PartialDatePicker } from '@/design-system/components/forms/PartialDatePicker';
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

export const Default = /* Default */ compose(S, "Default");
export const WithUnknownToggle = /* With Unknown Toggle */ compose(S, "WithUnknownToggle");
export const Prefilled = /* Prefilled */ compose(S, "Prefilled");

// The story's `Interactive` export only defines the BLANK mount — the
// meaningful state (typed date, then "No me acuerdo" clicked) is produced by
// its `play` function, which the compiled-preview harness never runs (it
// composes the story module's render/decorators, not its play step). Mirror
// the story's END state directly: PartialDatePicker's own `initialUnknown`
// prop seeds the same unknown=true render the play function arrives at
// (fields hidden, "Sin fecha (no me acuerdo)" shown below).
export const Interactive = function Render() {
  const [value, setValue] = useState<PhotoDate | null>(null);
  const [unknown, setUnknown] = useState(true);
  return (
    <div className="space-y-3">
      <PartialDatePicker
        allowUnknown
        initialUnknown
        onChange={(v, u) => { setValue(v); setUnknown(u); }}
      />
      <p className="text-xs text-muted-foreground">
        {unknown ? 'Sin fecha (no me acuerdo)' : value ? JSON.stringify(value) : 'Sin valor'}
      </p>
    </div>
  );
};
