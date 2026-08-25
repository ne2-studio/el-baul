// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Toast } from './Toast';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

// Extracts the numeric z-index a Tailwind class encodes, from either the bare utility
// (`z-50` -> 50) or an arbitrary value (`z-[70]` -> 70).
function zIndexOf(el: Element): number {
  const match = el.className.match(/\bz-\[(\d+)\]|\bz-(\d+)\b/);
  if (!match) throw new Error(`no z-index class found on: ${el.className}`);
  return Number(match[1] ?? match[2]);
}

describe('Toast', () => {
  it('stacks above an open BottomSheetModal (both sizes) so it is never hidden behind it', () => {
    // Regression: a modal (e.g. an "invite" flow) firing a "link copied" toast via onToast() without
    // closing its BottomSheetModal (intentional — lets the user still see/share the link).
    // Toast used to be z-50, the same as BottomSheetModal's size='lg' overlay and lower than
    // its size='sm' overlay (z-[60], the default for that size), so the toast
    // rendered invisibly underneath the modal. Toast must outrank both modal sizes.
    render(
      <>
        <BottomSheetModal onCancel={() => {}}>
          <p>Contenido del modal</p>
        </BottomSheetModal>
        <Toast message="Enlace copiado al portapapeles" onClose={() => {}} />
      </>
    );

    const smOverlay = screen.getByText('Contenido del modal').closest('.fixed')!;
    const toast = screen.getByText('Enlace copiado al portapapeles').closest('.fixed')!;

    expect(zIndexOf(toast)).toBeGreaterThan(zIndexOf(smOverlay));
  });

  it('stacks above BottomSheetModal size="lg" too', () => {
    render(
      <>
        <BottomSheetModal onCancel={() => {}} size="lg">
          <p>Contenido del modal lg</p>
        </BottomSheetModal>
        <Toast message="Enlace copiado al portapapeles" onClose={() => {}} />
      </>
    );

    const lgOverlay = screen.getByText('Contenido del modal lg').closest('.fixed')!;
    const toast = screen.getByText('Enlace copiado al portapapeles').closest('.fixed')!;

    expect(zIndexOf(toast)).toBeGreaterThan(zIndexOf(lgOverlay));
  });
});
