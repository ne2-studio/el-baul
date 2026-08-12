import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { RecuerdoEditModal } from '@/features/memories/components/RecuerdoEditModal';

const meta = {
  title: 'Features/Memories/RecuerdoEditModal',
  component: RecuerdoEditModal,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Bottom-sheet used to edit an existing memory's text.

### When to use
Use from \`RecuerdoCard\` (photo viewer) whenever a recuerdo is edited. Editing in a drawer keeps the visor's own viewport-with-keyboard handling (\`useVisualViewportInset\`, shared with every other \`BottomSheetModal\`) instead of squeezing an inline form into the viewer's fixed-height, half-photo/half-recuerdos layout, which broke apart once the on-screen keyboard opened.

### When NOT to use
Do not use for the initial "nuevo recuerdo" composer (\`RecuerdoInput\`) or feed-level editing, both of which have enough room to edit inline.

### Typical examples
Tapping the pencil icon on your own recuerdo inside the photo viewer.

### Common mistakes
Editing inline inside the card instead of via this modal — that's exactly the layout breakage under the keyboard this component exists to avoid.

### Related components
\`RecuerdoEditForm\` owns the textarea and save/cancel wiring, \`BottomSheetModal\` owns the overlay and keyboard-aware viewport.
`,
      },
    },
  },
} satisfies Meta<typeof RecuerdoEditModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialText: 'Recuerdo que hacía muchísimo calor y acabamos todos bañándonos en el río.',
    onCancel: fn(),
    onSave: fn(),
  },
  play: async ({ args }) => {
    // Renders via BottomSheetModal, which portals to document.body.
    const body = within(document.body);
    const saveButton = body.getByRole('button', { name: 'Guardar' });

    await expect(saveButton).toBeDisabled();
    await userEvent.type(body.getByLabelText('Contenido del recuerdo'), ' Qué día.');
    await expect(saveButton).toBeEnabled();

    await userEvent.click(saveButton);
    await expect(args.onSave).toHaveBeenCalled();
  },
};

export const Saving: Story = {
  args: {
    ...Default.args,
    isSaving: true,
  },
};
