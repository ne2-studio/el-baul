import * as React from 'react';
import * as S from "@ds-stories/src/features/memories/components/RecuerdoFeedCard.stories";

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

// The app's own .storybook/preview.tsx freezes Date to 2024-08-20T12:00:00Z
// for the real storybook build (globalThis.Date = FixedDate), so that's the
// "now" every relative-date fixture (createdAt etc.) was authored against.
// That override lives in a separate Storybook-global config file, never
// bundled into an individual component preview, so this compiled preview
// page has no equivalent — it falls back to compare.mjs's own frozen clock
// (2030-01-15), six years later, producing wildly different relative-time
// text ("Hace 5 años" vs "Hace un mes") for identical fixture timestamps.
// Not a component defect: mirror the app's own convention here so this
// preview's "now" matches what the storybook reference actually renders.
const ORIGINAL_DATE = Date;
const FIXED_NOW = new Date('2024-08-20T12:00:00.000Z').valueOf();
class FixedDate extends ORIGINAL_DATE {
  constructor(...args: any[]) {
    // @ts-expect-error - spread into Date's overloaded constructor
    super(...(args.length === 0 ? [FIXED_NOW] : args));
  }
  static now() { return FIXED_NOW; }
}
(globalThis as any).Date = FixedDate;

export const Default = /* Default */ compose(S, "Default");
export const WithPhoto = /* With Photo */ compose(S, "WithPhoto");
export const WithChapterBadge = /* With Chapter Badge */ compose(S, "WithChapterBadge");
export const Own = /* Own */ compose(S, "Own");
