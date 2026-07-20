import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecuerdosList } from './RecuerdosList';
import { Recuerdo } from './RecuerdoCard';

const meta = {
  title: 'Components/RecuerdosList',
  component: RecuerdosList,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="bg-foreground p-8"><Story /></div>],
} satisfies Meta<typeof RecuerdosList>;

export default meta;
type Story = StoryObj<typeof meta>;

const recuerdos: Recuerdo[] = [
  { id: '1', text: '¡Qué día tan bonito!', userName: 'Ana García', createdAt: '2024-07-15T10:00:00Z' },
  { id: '2', text: 'No me acordaba de esta foto, gracias por compartirla.', userName: 'Carlos Ruiz', createdAt: '2024-07-16T10:00:00Z' },
  { id: '3', text: 'Yo estuve ahí, fue un día increíble.', userName: 'Yo', isOwn: true, createdAt: '2024-07-17T10:00:00Z' },
  { id: '4', text: 'Cuánto ha llovido desde entonces.', userName: 'María López', createdAt: '2024-07-18T10:00:00Z' },
];

export const FewRecuerdos: Story = {
  args: {
    recuerdos: recuerdos.slice(0, 2),
    onUserClick: () => {},
  },
};

export const ManyRecuerdos: Story = {
  args: {
    recuerdos,
    onUserClick: () => {},
  },
};

export const WithoutUserClick: Story = {
  args: {
    recuerdos,
  },
};
