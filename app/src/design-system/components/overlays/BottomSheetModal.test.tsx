// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BottomSheetModal } from './BottomSheetModal';

describe('BottomSheetModal', () => {
  it('portals to document.body instead of rendering inside its parent', () => {
    // Regression: several screens mount the modal-opening menu inside a `position: sticky`
    // header with its own z-index (StickyHeader) — that creates a stacking context, so a
    // modal rendered as a plain descendant would have its z-index compared only within that
    // context instead of against the rest of the page, letting a page-level FAB (z-30) sit
    // above a modal that declares z-50/z-[60] (see BaulSettingsMenuContainer). Portaling to
    // document.body sidesteps this regardless of where the modal is mounted from.
    const { container } = render(
      <div data-testid="ancestor">
        <BottomSheetModal onCancel={() => {}}>
          <p>Contenido del modal</p>
        </BottomSheetModal>
      </div>
    );

    const content = screen.getByText('Contenido del modal');
    expect(content).toBeInTheDocument();
    expect(container.querySelector('[data-testid="ancestor"]')).not.toContainElement(content);
    expect(content.closest('body')).toBe(document.body);
  });
});
