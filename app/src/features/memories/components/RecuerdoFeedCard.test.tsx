// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Recuerdo } from '@/types';
import { RecuerdoFeedCard } from '@/features/memories/components/RecuerdoFeedCard';

function newRecuerdo(overrides: Partial<ConstructorParameters<typeof Recuerdo>[0]> = {}): Recuerdo {
  return new Recuerdo({
    id: 'r1',
    userId: 'user-1',
    text: 'Un recuerdo precioso',
    userName: 'Ana',
    createdAt: new Date().toISOString(),
    isOwn: false,
    ...overrides,
  });
}

// Regression coverage for a bug where tapping the avatar in the baúl-wide "Recuerdos" tab
// did nothing, because that tab rendered its own inline copy of the card that never wired
// up persona navigation at all — unlike the chapter feed's card, which did. RecuerdoFeedCard
// is now the single implementation both places render, so this pins the navigation contract.
describe('RecuerdoFeedCard', () => {
  it('opens the persona when the avatar is clicked and a personaId/handler are present', async () => {
    const user = userEvent.setup();
    const onUserClick = vi.fn();
    render(<RecuerdoFeedCard recuerdo={newRecuerdo({ personaId: 'persona-1' })} onUserClick={onUserClick} />);

    const avatar = screen.getByRole('button', { name: 'Ver perfil de Ana' });
    expect(avatar).toBeEnabled();

    await user.click(avatar);

    expect(onUserClick).toHaveBeenCalledWith('persona-1');
  });

  it('disables the avatar when there is no personaId', () => {
    render(
      <RecuerdoFeedCard recuerdo={newRecuerdo({ personaId: undefined })} onUserClick={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: 'Ver perfil de Ana' })).toBeDisabled();
  });

  it('disables the avatar when there is no onUserClick handler', () => {
    render(<RecuerdoFeedCard recuerdo={newRecuerdo({ personaId: 'persona-1' })} />);

    expect(screen.getByRole('button', { name: 'Ver perfil de Ana' })).toBeDisabled();
  });

  it('shows the chapter badge when not already inside that chapter', () => {
    render(
      <RecuerdoFeedCard recuerdo={newRecuerdo({ chapterId: 'chapter-1', chapterName: 'Verano 2019' })} />
    );

    expect(screen.getByRole('button', { name: 'en «Verano 2019»' })).toBeInTheDocument();
  });

  it('clicking the chapter badge opens that chapter', async () => {
    const user = userEvent.setup();
    const onChapterClick = vi.fn();
    render(
      <RecuerdoFeedCard
        recuerdo={newRecuerdo({ chapterId: 'chapter-1', chapterName: 'Verano 2019' })}
        onChapterClick={onChapterClick}
      />
    );

    await user.click(screen.getByRole('button', { name: 'en «Verano 2019»' }));

    expect(onChapterClick).toHaveBeenCalledWith('chapter-1');
  });

  it('hides the chapter badge when the card is already shown inside that chapter', () => {
    render(
      <RecuerdoFeedCard
        recuerdo={newRecuerdo({ chapterId: 'chapter-1', chapterName: 'Verano 2019' })}
        showChapterBadge={false}
      />
    );

    expect(screen.queryByRole('button', { name: 'en «Verano 2019»' })).not.toBeInTheDocument();
  });

  it('shows the photo instead of the chapter badge when the recuerdo is about a photo', () => {
    render(
      <RecuerdoFeedCard
        recuerdo={newRecuerdo({ photoId: 'photo-1', chapterId: 'chapter-1', chapterName: 'Verano 2019' })}
      />
    );

    expect(screen.getByRole('button', { name: 'Ver foto' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'en «Verano 2019»' })).not.toBeInTheDocument();
  });
});
