import React from 'react';
import { Check, Plus } from 'lucide-react';
import { Chapter } from './ChaptersView';

export type ChapterSelection =
  | { type: 'existing'; chapterId: string }
  | { type: 'new'; name: string }
  | { type: 'none' };

interface ChapterSelectorProps {
  chapters: Chapter[];
  /** The chapter this import was entered from, if any — shown first in the list, but never pre-selected. */
  currentChapterId?: string;
  value: ChapterSelection | null;
  onChange: (value: ChapterSelection) => void;
}

function Row({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
        selected ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-secondary/30'
      }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
        selected ? 'bg-primary border-primary' : 'border-border'
      }`}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
      {children}
    </button>
  );
}

export function ChapterSelector({ chapters, currentChapterId, value, onChange }: ChapterSelectorProps) {
  const orderedChapters = currentChapterId
    ? [...chapters].sort((a, b) => (a.id === currentChapterId ? -1 : b.id === currentChapterId ? 1 : 0))
    : chapters;

  return (
    <div className="space-y-2">
      {orderedChapters.map((chapter) => (
        <Row
          key={chapter.id}
          selected={value?.type === 'existing' && value.chapterId === chapter.id}
          onClick={() => onChange({ type: 'existing', chapterId: chapter.id })}
        >
          <span className="text-sm text-foreground">
            {chapter.name}
            {chapter.id === currentChapterId && (
              <span className="text-muted-foreground"> (este capítulo)</span>
            )}
          </span>
        </Row>
      ))}

      <Row selected={value?.type === 'new'} onClick={() => onChange({ type: 'new', name: '' })}>
        <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-foreground">Crear un capítulo nuevo</span>
      </Row>

      {value?.type === 'new' && (
        <input
          type="text"
          autoFocus
          value={value.name}
          onChange={(e) => onChange({ type: 'new', name: e.target.value })}
          placeholder="Nombre del capítulo"
          className="w-full ml-8 bg-secondary rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
          style={{ width: 'calc(100% - 2rem)' }}
        />
      )}

      <Row selected={value?.type === 'none'} onClick={() => onChange({ type: 'none' })}>
        <span className="text-sm text-foreground">Lo organizaré más tarde</span>
      </Row>
    </div>
  );
}
