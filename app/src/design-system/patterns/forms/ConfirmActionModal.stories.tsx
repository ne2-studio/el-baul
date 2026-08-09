import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';

const meta = {
  title: 'Patterns/Forms/ConfirmActionModal',
  component: ConfirmActionModal,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Bottom-sheet pattern for confirming a single action — a heading, a description, an optional
reason textarea gating confirm on a non-empty trimmed value, and a Cancel/Confirm footer wired
to \`isSubmitting\`.

### When to use
Use for any "are you sure?" or "tell us why" confirmation that fits a short bottom sheet:
deleting, revoking, or requesting something, whether or not it needs a reason.

### When NOT to use
Do not use for multi-field forms (see \`EditInfoModal\`) or flows that need more than a single
confirm action.

### Typical examples
Deleting a chapter, retiring a photo (with a reason), revoking a persona's access, or a
colaborador requesting a photo's removal (non-destructive, primary confirm, no Notice).

### Common mistakes
Passing a \`reason\` config but forgetting the caller still needs the trimmed value from
\`onConfirm\`; using \`tone="destructive"\` for an action that isn't actually irreversible.

### Related components
\`BottomSheetModal\` provides the shell, \`Notice\` renders the destructive-tone description,
\`Input\` provides the optional reason field, \`EditInfoModal\`/\`DateModal\` are the sibling
patterns for editing rather than confirming.
`,
      },
    },
  },
} satisfies Meta<typeof ConfirmActionModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Eliminar capítulo',
    description: (
      <>
        <span className="font-semibold">Atención:</span> 12 fotos y 3 recuerdos quedarán sueltos
        en el baúl. ¿Estás seguro?
      </>
    ),
    confirmLabel: 'Sí, eliminar capítulo',
    onCancel: fn(),
    onConfirm: fn(),
  },
  play: async ({ args }) => {
    // ConfirmActionModal renders BottomSheetModal, which portals to document.body (see its
    // comment) instead of rendering inside canvasElement.
    const body = within(document.body);
    const confirmButton = body.getByRole('button', { name: 'Sí, eliminar capítulo' });

    await expect(confirmButton).toBeEnabled();
    await userEvent.click(confirmButton);

    await expect(args.onConfirm).toHaveBeenCalledWith(undefined);
  },
};

export const WithReason: Story = {
  args: {
    title: 'Retirar esta foto',
    description: 'Esta foto dejará de estar disponible para todos los miembros del baúl.',
    reason: {
      label: 'Motivo de la retirada',
      placeholder: '¿Por qué se retira esta foto?',
      variant: 'destructive',
    },
    confirmLabel: 'Sí, retirar foto',
    onCancel: fn(),
    onConfirm: fn(),
  },
  play: async ({ args }) => {
    const body = within(document.body);
    const confirmButton = body.getByRole('button', { name: 'Sí, retirar foto' });
    const reasonInput = body.getByLabelText('Motivo de la retirada');

    await expect(confirmButton).toBeDisabled();

    await userEvent.type(reasonInput, '  Duplicada  ');
    await expect(confirmButton).toBeEnabled();

    await userEvent.click(confirmButton);
    await expect(args.onConfirm).toHaveBeenCalledWith('Duplicada');
  },
};

// RemovalRequestModal's shape: not itself destructive (a colaborador is only asking the
// custodio to review it), so a plain paragraph instead of a Notice, and a primary confirm.
export const PlainTone: Story = {
  args: {
    title: 'Solicitar retirada de esta foto',
    tone: 'plain',
    description: 'El custodio del baúl revisará tu solicitud.',
    reason: {
      placeholder: 'Cuéntanos por qué no quieres que esta foto aparezca en este baúl',
      rows: 4,
    },
    confirmLabel: 'Enviar solicitud',
    confirmVariant: 'primary',
    onCancel: fn(),
    onConfirm: fn(),
  },
  play: async ({ args }) => {
    const body = within(document.body);
    const confirmButton = body.getByRole('button', { name: 'Enviar solicitud' });

    await expect(confirmButton).toBeDisabled();

    await userEvent.type(body.getByPlaceholderText(/Cuéntanos por qué/), 'No me gusta');
    await expect(confirmButton).toBeEnabled();

    await userEvent.click(confirmButton);
    await expect(args.onConfirm).toHaveBeenCalledWith('No me gusta');
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
  play: async () => {
    const body = within(document.body);

    await expect(body.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await expect(body.getByRole('button', { name: 'Sí, eliminar capítulo' })).toBeDisabled();
  },
};
