import type { Meta, StoryObj } from '@storybook/react-vite';
import { BackButton } from '@/design-system/components/navigation/BackButton';

const meta = {
  title: 'Components/Navigation/BackButton',
  component: BackButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          `
### Purpose
Single component for every "volver"/back action in the app, covering both visual shapes that
appear across screens: a text link (icon + label) and an icon-only circle.

### When to use
Use inside \`PageHeader\` (which picks the right shape for you via its \`variant\`) or directly
when composing a bespoke header that doesn't fit \`PageHeader\`'s three variants.

### Common mistakes
Hand-rolling the icon size, the \`-ml-2\` optical alignment, or the disabled opacity instead of
reusing this component — that drift is exactly what caused headers to look inconsistent across
screens before this component existed.

### Related components
\`PageHeader\` composes this for every screen header; \`StickyHeader\`/\`PageContainer\` are the
shell it sits inside.
`,
      },
    },
  },
} satisfies Meta<typeof BackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithLabel: Story = {
  args: {
    label: 'Volver',
    onClick: () => alert('onClick clicked'),
  },
};

export const IconOnly: Story = {
  args: {
    onClick: () => alert('onClick clicked'),
  },
};

export const CustomLabel: Story = {
  args: {
    label: 'Cancelar',
    onClick: () => alert('onClick clicked'),
  },
};

export const WithLabelDisabled: Story = {
  args: {
    label: 'Volver',
    disabled: true,
    onClick: () => alert('onClick clicked'),
  },
};

export const IconOnlyDisabled: Story = {
  args: {
    disabled: true,
    onClick: () => alert('onClick clicked'),
  },
};
