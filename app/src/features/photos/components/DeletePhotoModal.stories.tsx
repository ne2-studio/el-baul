import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { DeletePhotoModal } from '@/features/photos/components/DeletePhotoModal';

const meta = {
  title: 'Features/Photos/DeletePhotoModal',
  component: DeletePhotoModal,
  tags: ['autodocs'],
} satisfies Meta<typeof DeletePhotoModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onCancel: fn(),
    onConfirm: fn(),
  },
  play: async ({ args }) => {
    // DeletePhotoModal renders BottomSheetModal, which portals to document.body (see its
    // comment) instead of rendering inside canvasElement.
    const body = within(document.body);
    const reasonInput = body.getByLabelText('Motivo de la retirada');
    const confirmButton = body.getByRole('button', { name: 'Sí, borrar foto' });

    await waitFor(() => expect(reasonInput).toHaveFocus());
    await expect(confirmButton).toBeDisabled();

    await userEvent.type(reasonInput, '  Aparece una persona que no quiere salir  ');
    await expect(confirmButton).toBeEnabled();

    await userEvent.click(confirmButton);
    await expect(args.onConfirm).toHaveBeenCalledWith('Aparece una persona que no quiere salir');
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
