import type { Meta, StoryObj } from '@storybook/react-vite';
import { BaulesList } from '@/features/baules/components/BaulesList';
import { Baul } from '@/types';
import { storybookPhotos } from '@/storybook/fixtures';

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
    coverPhotoUrl: storybookPhotos.familyCover,
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
