import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShareTargetBaulScreen } from './ShareTargetBaulScreen';
import { Baul } from '@/types';

const meta = {
  title: 'Screens/Sharing/ShareTarget',
  component: ShareTargetBaulScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ShareTargetBaulScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const baules: Baul[] = [
  { id: '1', name: 'Familia García', chapterCount: 4, lastUpdated: 'hace 2 días' } as Baul,
  { id: '2', name: 'Viajes', chapterCount: 2, coverPhotoUrl: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=300', lastUpdated: 'hace 1 semana' } as Baul,
];

export const Default: Story = {
  args: {
    baules,
    photoCount: 3,
    onSelectBaul: (baul) => alert(`onSelectBaul: ${baul.name}`),
    onCancel: () => alert('onCancel clicked'),
  },
};

export const Empty: Story = {
  args: {
    ...Default.args,
    baules: [],
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    isLoading: true,
  },
};
