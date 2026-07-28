import type { Meta, StoryObj } from '@storybook/react-vite';
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
    onCancel: () => alert('onCancel clicked'),
    onConfirm: () => alert('onConfirm clicked'),
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
