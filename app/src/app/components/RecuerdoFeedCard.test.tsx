import { describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { Recuerdo } from '@/types';
import { RecuerdoFeedCard } from './RecuerdoFeedCard';

// No RTL/jsdom set up in this repo yet (see vitest.config.ts: environment 'node'), and
// RecuerdoFeedCard is a plain, hook-free function component, so it's called directly and
// its returned React element tree is walked by data-testid instead of mounting to a DOM.
function findByTestId(node: ReactNode, testId: string): ReactElement<any> | undefined {
  if (node == null || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByTestId(child, testId);
      if (found) return found;
    }
    return undefined;
  }
  const element = node as ReactElement<any>;
  if (!element.props) return undefined;
  if (element.props['data-testid'] === testId) return element;
  return findByTestId(element.props.children, testId);
}

function newRecuerdo(overrides: Partial<Recuerdo> = {}): Recuerdo {
  return new Recuerdo({
    id: 'r1',
    text: 'Un recuerdo precioso',
    userName: 'Ana',
    createdAt: new Date().toISOString(),
    ...overrides,
  });
}

// Regression coverage for a bug where tapping the avatar in the baúl-wide "Recuerdos" tab
// did nothing, because that tab rendered its own inline copy of the card that never wired
// up persona navigation at all — unlike the chapter feed's card, which did. RecuerdoFeedCard
// is now the single implementation both places render, so this pins the navigation contract.
describe('RecuerdoFeedCard', () => {
  it('clicking the avatar opens the persona when a personaId and handler are present', () => {
    const onUserClick = vi.fn();
    const recuerdo = newRecuerdo({ personaId: 'persona-1' });

    const avatar = findByTestId(RecuerdoFeedCard({ recuerdo, onUserClick }), 'recuerdo-avatar');
    expect(avatar?.props.disabled).toBe(false);

    avatar?.props.onClick();

    expect(onUserClick).toHaveBeenCalledWith('persona-1');
  });

  it('disables the avatar when there is no personaId', () => {
    const recuerdo = newRecuerdo({ personaId: undefined });

    const avatar = findByTestId(RecuerdoFeedCard({ recuerdo, onUserClick: vi.fn() }), 'recuerdo-avatar');

    expect(avatar?.props.disabled).toBe(true);
    expect(avatar?.props.onClick).toBeUndefined();
  });

  it('disables the avatar when there is no onUserClick handler', () => {
    const recuerdo = newRecuerdo({ personaId: 'persona-1' });

    const avatar = findByTestId(RecuerdoFeedCard({ recuerdo }), 'recuerdo-avatar');

    expect(avatar?.props.disabled).toBe(true);
    expect(avatar?.props.onClick).toBeUndefined();
  });

  it('shows the chapter badge when not already inside that chapter', () => {
    const recuerdo = newRecuerdo({ chapterId: 'chapter-1', chapterName: 'Verano 2019' });

    const tree = RecuerdoFeedCard({ recuerdo });
    const badge = findByTestId(tree, 'recuerdo-chapter-badge');

    expect(badge).toBeDefined();
    expect(badge?.props.children).toContain('Verano 2019');
  });

  it('hides the chapter badge when the card is already shown inside that chapter', () => {
    const recuerdo = newRecuerdo({ chapterId: 'chapter-1', chapterName: 'Verano 2019' });

    const tree = RecuerdoFeedCard({ recuerdo, showChapterBadge: false });

    expect(findByTestId(tree, 'recuerdo-chapter-badge')).toBeUndefined();
  });

  it('shows the photo instead of the chapter badge when the recuerdo is about a photo', () => {
    const recuerdo = newRecuerdo({ photoId: 'photo-1', chapterId: 'chapter-1', chapterName: 'Verano 2019' });

    const tree = RecuerdoFeedCard({ recuerdo });

    expect(findByTestId(tree, 'recuerdo-photo')).toBeDefined();
    expect(findByTestId(tree, 'recuerdo-chapter-badge')).toBeUndefined();
  });
});
