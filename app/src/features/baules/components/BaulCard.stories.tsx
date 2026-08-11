import type { Meta, StoryObj } from '@storybook/react-vite';
import { BaulCard } from '@/features/baules/components/BaulCard';
import { Baul } from '@/types';
import { storybookEdgeText, storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Features/Baules/BaulCard',
  component: BaulCard,
  tags: ['autodocs'],
} satisfies Meta<typeof BaulCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseBaul: Baul = {
  id: '1',
  name: 'Familia García',
  description: 'Nuestros mejores momentos',
  chapterCount: 4,
  coverPhotoUrl: storybookPhotos.familyCover,
  lastUpdated: 'hace 2 días',
  role: 'administrador',
  isCustodio: true,
  memberCount: 5,
} as Baul;

export const Default: Story = {
  args: {
    baul: baseBaul,
    onClick: () => alert('onClick'),
  },
};

export const Colaborador: Story = {
  args: {
    ...Default.args,
    baul: {
      ...baseBaul,
      role: 'colaborador',
      isCustodio: false,
    } as Baul,
  },
};

export const WithoutCoverPhoto: Story = {
  args: {
    ...Default.args,
    baul: {
      ...baseBaul,
      coverPhotoUrl: undefined,
    } as Baul,
  },
};

export const MissingMetadata: Story = {
  args: {
    ...Default.args,
    baul: {
      id: 'edge-1',
      name: 'Baúl sin portada ni descripción',
      chapterCount: 0,
      lastUpdated: '',
      role: 'colaborador',
    } as Baul,
  },
};

export const LongNameAndDescription: Story = {
  args: {
    ...Default.args,
    baul: {
      ...baseBaul,
      name: storybookEdgeText.longBaulName,
      description: storybookEdgeText.missingMetadataNote,
      coverPhotoUrl: storybookPhotos.landscape,
      chapterCount: 14,
      memberCount: 12,
    } as Baul,
  },
};
