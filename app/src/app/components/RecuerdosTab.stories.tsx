import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecuerdosTab } from './RecuerdosTab';
import { Recuerdo } from '@/types';

const meta = {
  title: 'Features/Memories/RecuerdosTab',
  component: RecuerdosTab,
  tags: ['autodocs'],
} satisfies Meta<typeof RecuerdosTab>;

export default meta;
type Story = StoryObj<typeof meta>;

const recuerdos: Recuerdo[] = [
  { id: '1', text: '¡Qué día tan bonito!', userName: 'Ana García', createdAt: '2024-07-15T10:00:00Z' } as Recuerdo,
  { id: '2', text: 'Yo estuve ahí, fue un día increíble.', userName: 'Yo', isOwn: true, createdAt: '2024-07-16T10:00:00Z' } as Recuerdo,
];

export const Default: Story = {
  args: {
    recuerdos,
    onOpenChapter: (id) => alert(`onOpenChapter: ${id}`),
    onOpenPhoto: (id) => alert(`onOpenPhoto: ${id}`),
    onUserClick: (id) => alert(`onUserClick: ${id}`),
  },
};

export const Empty: Story = {
  args: {
    ...Default.args,
    recuerdos: [],
  },
};
