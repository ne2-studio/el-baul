import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hero } from '@/design-system/layouts/Hero';
import { storybookAvatars, storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Layouts/Hero',
  component: Hero,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    imageUrl: storybookPhotos.familyCover,
    title: 'Familia García',
    children: <p className="text-sm text-white/80 mt-1.5 leading-snug max-w-sm">Nuestros mejores momentos</p>,
  },
};

export const WithoutImage: Story = {
  args: {
    ...Default.args,
    imageUrl: undefined,
  },
};

export const TitleOnly: Story = {
  args: {
    imageUrl: storybookPhotos.beach,
    title: 'Verano 2024',
  },
};

// ─── Usos reales de cada pantalla — ver ChaptersView, PhotosView y PersonaDetailScreen ────

export const BaulHero: Story = {
  args: {
    imageUrl: storybookPhotos.familyCover,
    title: 'Familia García',
    children: <p className="text-sm text-white/80 mt-1.5 leading-snug max-w-sm">Nuestros mejores momentos</p>,
  },
};

export const BaulHeroWithoutDescription: Story = {
  args: {
    imageUrl: storybookPhotos.familyCover,
    title: 'Familia García',
    children: <p className="text-sm text-white/40 mt-1.5 italic">Sin descripción · edita desde el menú ···</p>,
  },
};

export const CapituloHero: Story = {
  args: {
    imageUrl: storybookPhotos.beach,
    title: 'Verano 2024',
    children: (
      <p className="text-xs text-white/65 mt-1 font-medium tracking-wide">1 jul – 15 ago 2024</p>
    ),
  },
};

export const PersonaHero: Story = {
  args: {
    imageUrl: storybookAvatars.abuela,
    blurUpscaledImage: false,
    title: 'Abuela',
    children: (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-white font-medium px-2 py-1 rounded-full bg-white/20">Colaborador</span>
        <span className="text-xs text-white/70">Ya pertenece al baúl</span>
      </div>
    ),
  },
};

export const PersonaHeroSinAcceso: Story = {
  args: {
    imageUrl: undefined,
    blurUpscaledImage: false,
    title: 'Laura',
    children: (
      <>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-white/70">Forma parte de la historia familiar</span>
        </div>
        <p className="mt-3 max-w-sm rounded-2xl bg-black/35 px-3 py-2 text-xs leading-relaxed text-white/90 backdrop-blur-sm">
          Forma parte de la historia familiar, pero no puede ver ni colaborar en el contenido.
        </p>
      </>
    ),
  },
};
