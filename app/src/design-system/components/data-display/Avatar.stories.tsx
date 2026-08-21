import type { Meta, StoryObj } from '@storybook/react-vite';
import { User } from 'lucide-react';
import { Avatar } from '@/design-system/components/data-display/Avatar';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Components/DataDisplay/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Circular avatar for a Persona/user photo, shared by every place that shows one — feed card headers, selection rows, badges, the claim-persona and profile screens.

### When to use
Anywhere a Persona or user is represented by a photo, falling back to initials or a generic icon when there's no photo yet.

### When NOT to use
Square/tiled photo treatments that aren't a fixed-size avatar (e.g. \`PersonaCard\`'s full-width photo tile) — those aren't this component.
`,
      },
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPhoto: Story = {
  args: { name: 'Ana García', src: storybookPhotos.people, size: 8 },
};

export const InitialsPlain: Story = {
  args: { name: 'Ana García', size: 8 },
};

export const InitialsColored: Story = {
  args: { name: 'Ana García', size: 8, initialsVariant: 'colored' },
};

export const FallbackIcon: Story = {
  args: { name: 'Ana García', size: 24, fallbackIcon: User, className: 'border-2 border-border bg-primary/10 text-primary' },
};

export const Sizes: Story = {
  args: { name: 'Ana García' },
  render: () => (
    <div className="flex items-end gap-4">
      {([6, 8, 10, 14, 24] as const).map((size) => (
        <Avatar key={size} name="Ana García" size={size} initialsVariant="colored" />
      ))}
    </div>
  ),
};

export const Clickable: Story = {
  args: { name: 'Ana García', size: 8, initialsVariant: 'colored', onClick: () => alert('onClick') },
};
