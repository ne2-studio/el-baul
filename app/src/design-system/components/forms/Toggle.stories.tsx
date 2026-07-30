import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toggle } from '@/design-system/components/forms/Toggle';

const meta = {
  title: 'Components/Forms/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Binary setting control for persistent preferences.

### When to use
Use for settings that can be switched on or off immediately, such as notification preferences.

### When NOT to use
Do not use for one-off commands, destructive confirmations, radio choices or temporary filters that need more than two states.

### Typical examples
Weekly email digest enabled/disabled, privacy preferences and future push-notification settings.

### Common mistakes
Using a custom div without \`role="switch"\`, hiding the label, or making the whole row look disabled while the switch still responds.
`,
      },
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Enabled: Story = {
  args: {
    checked: true,
    label: 'Resumen semanal por email',
    description: 'Recibirás cada semana un resumen de la actividad en tus baúles',
    onChange: () => alert('onChange clicked'),
  },
};

export const DisabledValue: Story = {
  args: {
    ...Enabled.args,
    checked: false,
    description: 'No recibirás el resumen semanal de actividad',
  },
};

export const Saving: Story = {
  args: {
    ...Enabled.args,
    disabled: true,
  },
};
