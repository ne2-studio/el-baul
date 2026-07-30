import { Plus } from 'lucide-react';
import { Chapter } from '@/types';
import { PhotoUploadDestination } from '@/features/photos/uploadFlow';
import { Input } from '@/design-system/components/forms/Input';
import { SelectionRow } from '@/design-system/components/data-display/SelectionRow';

export type ChapterSelection = PhotoUploadDestination;

interface ChapterSelectorProps {
  chapters: Chapter[];
  /** The chapter this import was entered from, if any — shown first in the list, but never pre-selected. */
  currentChapterId?: string;
  value: ChapterSelection | null;
  onChange: (value: ChapterSelection) => void;
}

export function ChapterSelector({ chapters, currentChapterId, value, onChange }: ChapterSelectorProps) {
  const orderedChapters = currentChapterId
    ? [...chapters].sort((a, b) => (a.id === currentChapterId ? -1 : b.id === currentChapterId ? 1 : 0))
    : chapters;

  return (
    <div className="space-y-2">
      {orderedChapters.map((chapter) => (
        <SelectionRow
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
        </SelectionRow>
      ))}

      <SelectionRow
        selected={value?.type === 'new'}
        onClick={() => onChange({ type: 'new', name: '' })}
        leading={<Plus className="w-4 h-4 text-muted-foreground shrink-0" />}
      >
        <span className="text-sm text-foreground">Crear un capítulo nuevo</span>
      </SelectionRow>

      {value?.type === 'new' && (
        <Input
          type="text"
          autoFocus
          value={value.name}
          onChange={(name) => onChange({ type: 'new', name })}
          placeholder="Nombre del capítulo"
          variant="modal"
          className="ml-8"
          inputClassName="text-sm focus:ring-ring"
          style={{ width: 'calc(100% - 2rem)' }}
        />
      )}

      <SelectionRow selected={value?.type === 'none'} onClick={() => onChange({ type: 'none' })}>
        <span className="text-sm text-foreground">Lo organizaré más tarde</span>
      </SelectionRow>
    </div>
  );
}
