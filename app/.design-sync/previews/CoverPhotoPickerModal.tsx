import * as React from 'react';
import * as S from "@ds-stories/src/features/photos/components/CoverPhotoPickerModal.stories";

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
// storybook screenshot shows) is produced by its `play` function: it clicks
// the first photo thumbnail, which transitions the modal from the "pick a
// photo" grid step to the "adjust cover" (zoom/position) step — THAT is what
// the reference screenshot shows, not the initial grid. The compiled-preview
// harness never runs `play`, so composing the story as-is renders the
// pre-play grid step instead. `step` is internal component state with no
// prop to seed it, so we reach the identical end state through the real
// component by replaying the same click: find the first photo thumbnail
// button (the story's own `getAllByRole('button', {name:'Foto'})` target)
// and dispatch a real click on it — a plain `<button>`, so a native `.click()`
// (unlike Radix triggers) is enough, no PointerEvent needed.
const DefaultBase = compose(S, "Default");
export const Default = function Render() {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    // `fetchPage` resolves asynchronously — the photo grid isn't there yet
    // on mount (still showing the loading spinner), so poll for the first
    // thumbnail instead of querying once. BottomSheetModal portals its
    // content to document.body (it doesn't render in place), so query the
    // document, not this wrapper div.
    let cancelled = false;
    const tryClick = () => {
      if (cancelled) return;
      const img = document.querySelector<HTMLImageElement>('img[alt="Foto"]');
      const button = img?.closest('button');
      if (button) { button.click(); return; }
      setTimeout(tryClick, 50);
    };
    tryClick();
    return () => { cancelled = true; };
  }, []);
  return React.createElement('div', { ref }, React.createElement(DefaultBase));
};
export const Empty = /* Empty */ compose(S, "Empty");
export const Loading = /* Loading */ compose(S, "Loading");
export const CoverPickerSheetMobileGrid = /* CoverPickerSheetMobileGrid */ compose(S, "CoverPickerSheetMobileGrid");
export const CoverPickerNarrowOverflowGrid = /* CoverPickerNarrowOverflowGrid */ compose(S, "CoverPickerNarrowOverflowGrid");
export const CoverPickerDesktopDrawerGrid = /* CoverPickerDesktopDrawerGrid */ compose(S, "CoverPickerDesktopDrawerGrid");
