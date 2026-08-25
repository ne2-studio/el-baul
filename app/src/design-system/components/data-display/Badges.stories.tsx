import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChapterBadge, CounterBadge, PersonBadge, RoleBadge } from '@/design-system/components/data-display/Badges';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Components/DataDisplay/Badges',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Small contextual labels for product metadata that should be scannable but not compete with primary content.

### When to use
Use \`ChapterBadge\` to show where a memory belongs, \`PersonBadge\` for compact tagged people, \`RoleBadge\` for access roles, and \`CounterBadge\` for compact numeric counts inside rows or menus.

### When NOT to use
Do not use badges for primary actions, long explanatory text, error states or counters that need stronger feedback semantics.

### Typical examples
The chapter chip in a memory card, tagged people below a photo, and a person's role over a hero image.

### Common mistakes
Creating one-off rounded labels in feature screens, mixing role text with arbitrary colors, or making clickable badges without a clear destination.
`,
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Chapter: Story = {
  render: () => <ChapterBadge chapterName="Verano 2024" onClick={() => alert('onClick clicked')} />,
};

export const Person: Story = {
  render: () => (
    <div className="bg-foreground p-6">
      <PersonBadge nickname="Abuela Rosa" avatarUrl={storybookPhotos.people} onClick={() => alert('onClick clicked')} />
    </div>
  ),
};

export const Role: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <RoleBadge role="administrador" isCustodio />
      <RoleBadge role="administrador" />
      <RoleBadge role="colaborador" />
    </div>
  ),
};

export const OnImage: Story = {
  render: () => (
    <div className="inline-block bg-foreground p-6">
      <RoleBadge role="administrador" tone="onImage" />
    </div>
  ),
};

export const Counter: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Small numeric indicator for compact menu items or notification counts. Use it for counts that are secondary to a row label, not as a standalone status.',
      },
    },
  },
  render: () => <CounterBadge count={3} />,
};
