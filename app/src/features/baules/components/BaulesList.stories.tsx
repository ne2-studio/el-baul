import type { Meta, StoryObj } from '@storybook/react-vite';
import { BaulesList } from '@/features/baules/components/BaulesList';
import { Baul } from '@/types';
import { storybookEdgeText, storybookPhotos } from '@/storybook/fixtures';

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

export const ManyBaulesWithPartialMetadata: Story = {
  args: {
    ...Default.args,
    baules: [
      {
        id: 'edge-1',
        name: storybookEdgeText.longBaulName,
        description: storybookEdgeText.missingMetadataNote,
        chapterCount: 14,
        coverPhotoUrl: storybookPhotos.landscape,
        lastUpdated: 'hace 1 minuto',
        isCustodio: true,
        memberCount: 12,
      },
      {
        id: 'edge-2',
        name: 'Baúl sin portada ni descripción',
        chapterCount: 0,
        lastUpdated: '',
        isCustodio: false,
        role: 'colaborador',
      },
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `edge-${index + 3}`,
        name: `Archivo familiar ${index + 1}`,
        description: index % 2 === 0 ? 'Fotos antiguas todavía sin ordenar' : undefined,
        chapterCount: index,
        coverPhotoUrl: index % 3 === 0 ? storybookPhotos.album : undefined,
        lastUpdated: index % 2 === 0 ? 'hace 2 meses' : '',
        isCustodio: index % 2 === 0,
        role: index % 2 === 0 ? 'custodio' as const : 'colaborador' as const,
        memberCount: index + 1,
      })),
    ],
  },
};
