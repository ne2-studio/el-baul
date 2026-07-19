import type { Meta, StoryObj } from '@storybook/react-vite';
import { InvitacionScreen } from './InvitacionScreen';

const meta = {
  title: 'Components/InvitacionScreen',
  component: InvitacionScreen,
  tags: ['autodocs'],
} satisfies Meta<typeof InvitacionScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const previewPhotos = [
  'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=400',
  'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400',
  'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=400',
  'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400',
];

export const Default: Story = {
  args: {
    baulNombre: 'Familia García',
    personaNickname: 'Marta',
    previewPhotos,
    onUnirme: () => {},
    onVerMas: () => {},
  },
};

export const SinPreview: Story = {
  args: {
    baulNombre: 'Familia García',
    personaNickname: 'Marta',
    previewPhotos: [],
    onUnirme: () => {},
    onVerMas: () => {},
  },
};
