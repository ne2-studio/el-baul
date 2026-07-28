import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { PartialDatePicker } from '@/design-system/components/forms/PartialDatePicker';
import { PhotoDate } from '@/types';

const meta = {
  title: 'Components/Forms/PartialDatePicker',
  component: PartialDatePicker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Date-entry primitive for memories and photos where the user may know only the year, year/month, full date, or no date.

### When to use
Use for product dates that can legitimately be partial or unknown, especially photo dates and chapter ranges inferred from photo metadata.

### When NOT to use
Do not replace it with a native full-date picker when uncertainty matters. Do not use for technical timestamps, billing dates or exact scheduling.

### Typical examples
Changing a photo date, batch assigning dates, editing biographical dates, or collecting "no me acuerdo" through \`allowUnknown\`.

### Common mistakes
Forcing day/month when the product accepts partial dates, ignoring the unknown flag, or storing empty strings instead of a structured partial date.

### Related components
\`DateModal\` wraps this picker for modal flows; \`formatPartialDate\` and \`formatDateRange\` display the same partial-date model in feature screens.
`,
      },
    },
  },
} satisfies Meta<typeof PartialDatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onChange: () => alert('onChange clicked'),
  },
};

export const WithUnknownToggle: Story = {
  args: {
    allowUnknown: true,
    onChange: () => alert('onChange clicked'),
  },
};

export const Prefilled: Story = {
  args: {
    initialValue: { year: 2021, month: 8, day: 3 },
    onChange: () => alert('onChange clicked'),
  },
};

export const Interactive: Story = {
  args: {
    onChange: () => alert('onChange clicked'),
  },
  render: function Render() {
    const [value, setValue] = useState<PhotoDate | null>(null);
    const [unknown, setUnknown] = useState(false);
    return (
      <div className="space-y-3">
        <PartialDatePicker
          allowUnknown
          onChange={(v, u) => { setValue(v); setUnknown(u); }}
        />
        <p className="text-xs text-muted-foreground">
          {unknown ? 'Sin fecha (no me acuerdo)' : value ? JSON.stringify(value) : 'Sin valor'}
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const yearInput = canvas.getByLabelText(/Año/);
    const monthSelect = canvas.getByLabelText('Mes');
    const dayInput = canvas.getByLabelText('Día');

    await expect(canvas.getByText('Sin valor')).toBeInTheDocument();
    await userEvent.type(yearInput, '2024');
    await userEvent.selectOptions(monthSelect, '7');
    await userEvent.type(dayInput, '15');

    await expect(canvas.getByText('{"year":2024,"month":7,"day":15}')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'No me acuerdo' }));
    await expect(canvas.getByText('Sin fecha (no me acuerdo)')).toBeInTheDocument();
    await expect(canvas.queryByLabelText(/Año/)).not.toBeInTheDocument();
  },
};
