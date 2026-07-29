import * as React from 'react';
import * as S from "@ds-stories/src/features/people/components/PersonaDetailScreen.stories";

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
export const PendingInvite = /* Pending Invite */ compose(S, "PendingInvite");
export const NonAdminView = /* Non Admin View */ compose(S, "NonAdminView");

// The story's `NoAccess` export's true rendered state (what the real
// storybook screenshot shows) is produced by its `play` function, which
// clicks the "Opciones de la persona" dropdown trigger and asserts its
// items — the compiled-preview harness never runs `play`, so composing the
// story as-is renders the pre-play CLOSED menu instead. PersonaDetailScreen
// doesn't expose a prop to seed the menu open (the DropdownMenu inside is
// mounted uncontrolled), so we reach the identical end state through the
// real component by replaying the same interaction `userEvent.click`
// performs: Radix's DropdownMenuTrigger opens on `pointerdown` (see its
// onPointerDown handler, not onClick), so dispatching a synthetic pointer
// event reaches the same `onOpenToggle()` a real click would — and, unlike
// a keyboard-triggered open, it does NOT auto-highlight the first item,
// matching the mouse-driven `userEvent.click` the story's play() uses.
const NoAccessBase = compose(S, "NoAccess");
export const NoAccess = function Render() {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const btn = ref.current?.querySelector<HTMLButtonElement>(
      'button[aria-label="Opciones de la persona"]'
    );
    if (!btn) return;
    btn.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse',
    }));
  }, []);
  return React.createElement('div', { ref }, React.createElement(NoAccessBase));
};
