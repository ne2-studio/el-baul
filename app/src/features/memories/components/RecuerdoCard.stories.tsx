import type { Meta, StoryObj } from '@storybook/react-vite';
import { Recuerdo } from '@/types';
import { RecuerdoCard } from '@/features/memories/components/RecuerdoCard';
import { storybookAvatars } from '@/storybook/fixtures';

const meta = {
  title: 'Features/Memories/RecuerdoCard',
  component: RecuerdoCard,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="bg-foreground p-8"><Story /></div>],
} satisfies Meta<typeof RecuerdoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const recuerdo: Recuerdo = new Recuerdo({
  id: '1',
  text: '¡Qué día tan bonito! Recuerdo que hacía muchísimo calor y acabamos todos bañándonos en el río.',
  personaId: 'user-1',
  userId: 'user-1',
  userName: 'Ana García',
  createdAt: '2024-07-15T10:00:00Z',
  isOwn: false,
});

export const Default: Story = {
  args: {
    recuerdo,
    onUserClick: () => alert('onUserClick clicked'),
  },
};

export const Own: Story = {
  args: {
    recuerdo: new Recuerdo({ ...recuerdo, userId: 'user-1', isOwn: true }),
    onUserClick: () => alert('onUserClick clicked'),
  },
};

export const WithAvatar: Story = {
  args: {
    recuerdo: new Recuerdo({
      ...recuerdo,
      userId: 'user-1',
      isOwn: false,
      userAvatar: storybookAvatars.abuela,
    }),
    onUserClick: () => alert('onUserClick clicked'),
  },
};

export const LongText: Story = {
  args: {
    recuerdo: new Recuerdo({
      ...recuerdo,
      userId: 'user-1',
      isOwn: false,
      text: 'Este fue uno de esos días que se quedan grabados para siempre. Habíamos planeado la excursión durante semanas y, cuando por fin llegó el día, ni una sola nube en el cielo. Comimos en la orilla del río, contamos historias de la abuela y nos bañamos hasta que se puso el sol. No hace falta ni cerrar los ojos para volver a sentir ese calor en la piel.',
    }),
    onUserClick: () => alert('onUserClick clicked'),
  },
};

export const WithoutUserClick: Story = {
  args: {
    recuerdo,
  },
};
