import type { Meta, StoryObj } from '@storybook/react-vite';
import { BaulesList, Baul } from '@/features/baules/components/BaulesList';

const meta = {
  title: 'Screens/Baules/List',
  component: BaulesList,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof BaulesList>;

export default meta;
type Story = StoryObj<typeof meta>;

const baules: Baul[] = [
  {
    id: '1',
    name: 'Familia García',
    description: 'Nuestros mejores momentos',
    chapterCount: 4,
    coverPhotoUrl: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=600',
    lastUpdated: 'hace 2 días',
    isCustodio: true,
    memberCount: 5,
  },
  {
    id: '2',
    name: 'Viajes',
    chapterCount: 2,
    lastUpdated: 'hace 1 semana',
    isCustodio: false,
    role: 'colaborador',
  },
];

export const Default: Story = {
  args: {
    baules,
    onSelectBaul: (baul) => alert(`onSelectBaul: ${baul.name}`),
    onCreateBaul: () => alert('onCreateBaul clicked'),
    onOpenProfileMenu: () => alert('onOpenProfileMenu clicked'),
  },
};

export const Empty: Story = {
  args: {
    ...Default.args,
    baules: [],
  },
};

export const WithPlanLimit: Story = {
  args: {
    ...Default.args,
    monetizationEnabled: true,
    baulesUsed: 1,
    baulesLimit: 1,
  },
};
