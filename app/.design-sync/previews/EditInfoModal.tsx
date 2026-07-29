import * as React from 'react';
import * as S from "@ds-stories/src/design-system/patterns/forms/EditInfoModal.stories";
import { EditInfoModal } from '@/design-system/patterns/forms/EditInfoModal';

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

// The story's `Default` export seeds `initialName`/`initialDescription` with
// "Familia Jimena" / "Nuestros momentos en familia", but its `play` function
// then clears both fields and retypes "Familia García" / "Recuerdos del
// verano" — that post-play state is what the real storybook screenshot
// shows (play() runs automatically there). The compiled-preview harness
// never runs `play`, so composing the story as-is renders the pre-play seed
// values instead. EditInfoModal's `name`/`description` are seeded once from
// `initialName`/`initialDescription` (plain useState, no re-seed effect), so
// mirroring the end state only requires passing the END values as the
// initial* props directly — same component, same composition, just fed the
// values `play` arrives at.
export const Default = function Render() {
  return (
    <EditInfoModal
      title="Editar información del baúl"
      initialName="Familia García"
      initialDescription="Recuerdos del verano"
      namePlaceholder="Nombre del baúl"
      onCancel={() => {}}
      onSave={() => {}}
    />
  );
};
export const Submitting = /* Submitting */ compose(S, "Submitting");
