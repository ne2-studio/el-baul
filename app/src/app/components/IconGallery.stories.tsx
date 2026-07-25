import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './Icon';
import { icons, type IconName } from './icons';

interface GalleryArgs {
  filter: string;
}

function IconRegistryGallery({ filter }: GalleryArgs) {
  const names = (Object.keys(icons) as IconName[]).slice().sort((a, b) => a.localeCompare(b));
  const query = filter.trim().toLowerCase();
  const visible = query ? names.filter((name) => name.toLowerCase().includes(query)) : names;

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        {visible.length} de {names.length} iconos oficiales
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visible.map((name) => (
          <div
            key={name}
            title={name}
            className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-foreground"
          >
            <Icon icon={icons[name]} size="lg" aria-hidden />
            <span className="w-full truncate text-center text-xs text-muted-foreground">{name}</span>
          </div>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No se encontró ningún icono para &quot;{filter}&quot;.
        </p>
      )}
    </div>
  );
}

const meta = {
  title: 'Foundations/Icons/Gallery',
  parameters: {
    docs: {
      description: {
        component:
          'Every icon the product has officially adopted, ordered alphabetically and generated directly from the `icons` registry in icons.ts - not a second, manually kept list. If an icon you need is missing here, see "Adding a new icon" in the Icon docs before importing straight from lucide-react.',
      },
    },
  },
  argTypes: {
    filter: {
      control: 'text',
      description: 'Filter the gallery by icon name.',
    },
  },
  args: {
    filter: '',
  },
  render: (args) => <IconRegistryGallery {...args} />,
} satisfies Meta<GalleryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gallery: Story = {};
