import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pencil, Share2 } from 'lucide-react';
import { FeedCardHeader } from '@/design-system/components/data-display/FeedCardHeader';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Components/DataDisplay/FeedCardHeader',
  component: FeedCardHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Shared "who did what, when" header for feed cards — avatar, author + action verb phrase on one line, relative time on its own line below.

### When to use
The first line of any card in the baúl feed: a recuerdo card ("<nombre> dejó un recuerdo") or a photo-upload-batch card ("<nombre> subió N fotos").

### When NOT to use
Standalone author bylines that aren't part of a feed card — reuse the design system's other data-display primitives instead.
`,
      },
    },
  },
} satisfies Meta<typeof FeedCardHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Recuerdo: Story = {
  args: {
    name: 'Tita Loli',
    actionText: 'dejó un recuerdo',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    onAvatarClick: () => alert('onAvatarClick'),
  },
};

export const PhotoBatch: Story = {
  args: {
    ...Recuerdo.args,
    name: 'Ana García',
    actionText: 'subió 6 fotos',
    avatarUrl: storybookPhotos.people,
  },
};

export const WithTrailingActions: Story = {
  args: {
    ...Recuerdo.args,
    trailing: (
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Editar" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary">
          <Pencil className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button type="button" aria-label="Compartir" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary">
          <Share2 className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    ),
  },
};

export const NoAvatarLink: Story = {
  args: {
    name: 'Ana García',
    actionText: 'dejó un recuerdo',
    timestamp: new Date().toISOString(),
  },
};
