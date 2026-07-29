import * as React from 'react';
import * as S from "@ds-stories/src/features/photos/components/PhotoViewer.stories";

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

// PhotoViewer embeds RecuerdoInput, which picks its placeholder prompt via
// `PROMPTS[Math.floor(Math.random() * PROMPTS.length)]` — both on mount
// (useState initializer) and again in a useEffect keyed on `photoId`, so the
// rendered placeholder is genuinely nondeterministic (not a Date/clock
// issue). Per the fix-decision-tree's "truly random content" guidance
// (same fix as .design-sync/previews/RecuerdoInput.tsx), pin it here so this
// preview is stable and matches what the reference storybook capture shows.
// Each story loads in its own isolated page (`?story=<Export>` navigation),
// so patching the global Math.random for this module's lifetime only
// affects this page.
const ORIGINAL_MATH_RANDOM = Math.random;
// 0.3 -> Math.floor(0.3 * 5) === 1 -> PROMPTS[1] === '¿Qué estaba pasando aquí?'
// (matches this round's storybook capture across every PhotoViewer story).
Math.random = () => 0.3;
void ORIGINAL_MATH_RANDOM;

export const Default = /* Default */ compose(S, "Default");
export const FirstPhoto = /* First Photo */ compose(S, "FirstPhoto");
export const LastPhoto = /* Last Photo */ compose(S, "LastPhoto");
export const WithoutRecuerdos = /* Without Recuerdos */ compose(S, "WithoutRecuerdos");
export const ReadOnlyCollaborator = /* Read Only Collaborator */ compose(S, "ReadOnlyCollaborator");
export const PhotoViewerMobileStack = /* Photo Viewer Mobile Stack */ compose(S, "PhotoViewerMobileStack");
export const PhotoViewerDesktopSideNavigation = /* Photo Viewer Desktop Side Navigation */ compose(S, "PhotoViewerDesktopSideNavigation");
