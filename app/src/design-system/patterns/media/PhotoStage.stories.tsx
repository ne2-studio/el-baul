import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoStage } from '@/design-system/patterns/media/PhotoStage';

const meta = {
  title: 'Patterns/Media/PhotoStage',
  component: PhotoStage,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="bg-foreground h-[70vh]"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Immersive photo-viewer stage that prioritizes the image while preserving previous/next navigation.

### When to use
Use inside photo viewer flows where one photo is the primary object and navigation between neighboring photos is available or intentionally disabled.

### When NOT to use
Do not use for galleries, thumbnails, cover pickers or upload previews; those need denser grid/list patterns. Do not place it inside decorative cards.

### Typical examples
The main \`PhotoViewer\` uses it with metadata, memories and actions around the image. Stories cover first, last and single-photo boundaries.

### Common mistakes
Forgetting stable \`photoKey\` when the image changes, exposing previous/next controls when no adjacent photo exists, or using a light background around the stage.

### Related components
\`PhotoViewerHeader\` supplies top actions, \`DateModal\`, \`MoveModal\`, \`TagPersonasModal\` and \`RecuerdoInput\` supply surrounding photo workflows.
`,
      },
    },
  },
} satisfies Meta<typeof PhotoStage>;

export default meta;
type Story = StoryObj<typeof meta>;

const src = 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=1200';

export const Default: Story = {
  args: {
    photoKey: 'photo-1',
    src,
    alt: 'Foto de ejemplo',
    direction: 1,
    hasPrevious: true,
    hasNext: true,
    onPrevious: () => alert('onPrevious clicked'),
    onNext: () => alert('onNext clicked'),
  },
};

export const FirstPhoto: Story = {
  args: {
    ...Default.args,
    hasPrevious: false,
  },
};

export const LastPhoto: Story = {
  args: {
    ...Default.args,
    hasNext: false,
  },
};

export const SinglePhoto: Story = {
  args: {
    ...Default.args,
    hasPrevious: false,
    hasNext: false,
  },
};
