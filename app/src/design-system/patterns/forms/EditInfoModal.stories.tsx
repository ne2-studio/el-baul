import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditInfoModal } from '@/design-system/patterns/forms/EditInfoModal';

const meta = {
  title: 'Patterns/Forms/EditInfoModal',
  component: EditInfoModal,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Reusable bottom-sheet form pattern for editing a title/name plus optional longer description.

### When to use
Use when a feature needs a compact edit flow for existing information without leaving the current screen.

### When NOT to use
Do not use for creation flows that need a full page, multi-step forms, destructive confirmations or fields that are not name/description shaped.

### Typical examples
Editing baul information and similar metadata forms that need cancel/save actions and an \`isSubmitting\` state.

### Common mistakes
Adding unrelated controls until the sheet becomes a full settings screen, using it for delete flows, or omitting realistic initial values in stories.

### Related components
\`BottomSheetModal\` provides the shell, \`Input\` provides fields, \`Button\` provides save/cancel actions, \`DateModal\` handles date-specific editing.
`,
      },
    },
  },
} satisfies Meta<typeof EditInfoModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Editar información del baúl',
    initialName: 'Familia Jimena',
    initialDescription: 'Nuestros momentos en familia',
    namePlaceholder: 'Nombre del baúl',
    onCancel: () => alert('onCancel clicked'),
    onSave: () => alert('onSave clicked'),
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
