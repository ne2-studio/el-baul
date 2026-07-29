import * as React from 'react';
import * as S from "@ds-stories/src/features/photos/components/DeletePhotoModal.stories";

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

// The story's `Default` export's true rendered state (what the real
// storybook screenshot shows) is produced by its `play` function: it types
// '  Aparece una persona que no quiere salir  ' into the "Motivo de la
// retirada" textarea, which enables the (otherwise disabled) "Sí, retirar
// foto" button. The compiled-preview harness never runs `play`, so composing
// the story as-is renders the pre-play blank/disabled state instead.
// DeletePhotoModal keeps `reason` as internal component state with no prop
// to seed it, so we reach the identical end state through the real
// component by replaying the same interaction `userEvent.type` performs:
// set the textarea's value via the native setter (bypassing React's tracked
// value so the subsequent `input` event is seen as a real change) and
// dispatch a bubbling `input` event, which the component's own onChange
// picks up exactly as a real keystroke would.
const DefaultBase = compose(S, "Default");
export const Default = function Render() {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const textarea = ref.current?.querySelector<HTMLTextAreaElement>('textarea');
    if (!textarea) return;
    const setValue = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;
    setValue?.call(textarea, '  Aparece una persona que no quiere salir  ');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }, []);
  return React.createElement('div', { ref }, React.createElement(DefaultBase));
};
export const Submitting = /* Submitting */ compose(S, "Submitting");
