import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DateModal } from '@/design-system/patterns/forms/DateModal';

const meta = {
  title: 'Patterns/Forms/DateModal',
  component: DateModal,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Bottom-sheet pattern for changing a partial or unknown date with a focused confirm action.

### When to use
Use when a photo or batch action needs date editing in context, without moving the user away from the viewer or selection flow.

### When NOT to use
Do not use for ordinary text metadata, exact calendar scheduling or long multi-field forms. Use a feature-specific modal if extra domain constraints are required.

### Typical examples
Changing the date of a photo from the viewer or applying a date to selected photos through batch actions.

### Common mistakes
Dropping the submitting state, bypassing \`PartialDatePicker\`, or treating unknown dates as validation errors.

### Related components
\`PartialDatePicker\` owns the date model, \`BottomSheetModal\` owns the overlay, \`Button\` owns confirm feedback, \`PhotoStage\` is a frequent surrounding context.
`,
      },
    },
  },
} satisfies Meta<typeof DateModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Cambiar fecha de la foto',
    onCancel: fn(),
    onConfirm: fn(),
  },
  play: async ({ args }) => {
    // DateModal renders BottomSheetModal, which portals to document.body (see its comment)
    // instead of rendering inside canvasElement.
    const body = within(document.body);
    const confirmButton = body.getByRole('button', { name: 'Confirmar' });

    await expect(confirmButton).toBeDisabled();
    await userEvent.type(body.getByLabelText(/Año/), '2024');
    await userEvent.selectOptions(body.getByLabelText('Mes'), '7');
    await expect(confirmButton).toBeEnabled();

    await userEvent.click(confirmButton);
    await expect(args.onConfirm).toHaveBeenCalledWith({ year: 2024, month: 7, day: undefined });
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};

// Reproduces: editing the date of a photo that already has one must pre-fill the picker with
// that date, not force the user to retype it from scratch.
export const Prefilled: Story = {
  args: {
    title: 'Cambiar fecha de la foto',
    initialValue: { year: 2021, month: 8, day: 3 },
    onCancel: fn(),
    onConfirm: fn(),
  },
  play: async ({ args }) => {
    const body = within(document.body);

    await expect(body.getByLabelText(/Año/)).toHaveValue(2021);
    await expect(body.getByLabelText('Mes')).toHaveValue('8');
    await expect(body.getByLabelText('Día')).toHaveValue(3);

    const confirmButton = body.getByRole('button', { name: 'Confirmar' });
    await expect(confirmButton).toBeEnabled();
    await userEvent.click(confirmButton);
    await expect(args.onConfirm).toHaveBeenCalledWith({ year: 2021, month: 8, day: 3 });
  },
};
