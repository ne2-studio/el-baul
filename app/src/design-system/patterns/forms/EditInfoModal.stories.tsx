import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
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
    onCancel: fn(),
    onSave: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const nameInput = canvas.getByLabelText('Nombre');
    const descriptionInput = canvas.getByLabelText('Descripción');
    const saveButton = canvas.getByRole('button', { name: 'Guardar' });

    await waitFor(() => expect(nameInput).toHaveFocus());
    await userEvent.clear(nameInput);
    await expect(saveButton).toBeDisabled();

    await userEvent.type(nameInput, '  Familia García  ');
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, '  Recuerdos del verano  ');
    await expect(saveButton).toBeEnabled();

    await userEvent.click(saveButton);
    await expect(args.onSave).toHaveBeenCalledWith('Familia García', 'Recuerdos del verano');
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
