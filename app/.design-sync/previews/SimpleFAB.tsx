import * as React from 'react';
import * as S from "@ds-stories/src/design-system/components/actions/FAB.stories";

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

// SimpleFAB/ExpandableFAB render a `position: fixed` root with no normal-flow
// siblings. The product card's single-story wrapper (`.ds-single`) creates a
// containing block for fixed descendants via `transform`, but that wrapper
// has no intrinsic size of its own — with only fixed children inside it, it
// collapses to 0x0, so `bottom`/`right` offsets resolve against a
// zero-height box instead of the card viewport. Giving this sizing div an
// explicit height (a normal-flow box, so it actually contributes to the
// parent's auto height) fixes the containing block's size without changing
// anything about the real component.
function sized(Inner: () => any) {
  return () => React.createElement('div', { style: { position: 'relative', height: '100vh', width: '100%' } }, React.createElement(Inner));
}

export const Simple = sized(compose(S, "Simple"));
export const SimpleWithIcon = sized(compose(S, "SimpleWithIcon"));
