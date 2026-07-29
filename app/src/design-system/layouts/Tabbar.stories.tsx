import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { PageContainer } from '@/design-system/layouts/PageContainer';

// Sin autodocs a propósito: Tabbar no es un componente autocontenido de props simples que
// se explique bien con una tabla de props generada — su valor está en las 3 composiciones
// reales (Baúl/Capítulo/Persona) de abajo, documentadas como stories con nombre.
const meta = {
  title: 'Layouts/Tabbar',
  component: Tabbar,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Tabbar>;

export default meta;
type Story = StoryObj<typeof meta>;

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer className="py-8">
      <div className="bg-card rounded-2xl border border-border p-6 text-foreground">{children}</div>
    </PageContainer>
  );
}

// Uso real en ChaptersView.tsx (pantalla del Baúl): 3 pestañas.
export const BaulDetailThreeTabs: Story = {
  args: {
    tabs: [
      { key: 'capitulos', label: 'Capítulos', count: 5 },
      { key: 'recuerdos', label: 'Recuerdos', count: 3 },
      { key: 'personas', label: 'Personas', count: 4 },
    ],
    active: 'capitulos',
    onChange: () => {},
    children: null,
  },
  render: function Render() {
    const [active, setActive] = useState('capitulos');
    return (
      <div className="min-h-screen bg-background">
        <Tabbar
          tabs={[
            { key: 'capitulos', label: 'Capítulos', count: 5 },
            { key: 'recuerdos', label: 'Recuerdos', count: 3 },
            { key: 'personas', label: 'Personas', count: 4 },
          ]}
          active={active}
          onChange={setActive}
        >
          {active === 'capitulos' && <Panel>Capítulos del baúl</Panel>}
          {active === 'recuerdos' && <Panel>Recuerdos escritos por la familia</Panel>}
          {active === 'personas' && <Panel>Personas etiquetadas en el baúl</Panel>}
        </Tabbar>
      </div>
    );
  },
};

// Uso real en PhotosView.tsx (pantalla de Capítulo): 2 pestañas, y solo aparece cuando el
// capítulo soporta un feed de Recuerdos (no en el capítulo virtual de fotos sueltas).
export const ChapterDetailTwoTabs: Story = {
  args: {
    tabs: [
      { key: 'fotos', label: 'Fotos', count: 24 },
      { key: 'recuerdos', label: 'Recuerdos', count: 3 },
    ],
    active: 'fotos',
    onChange: () => {},
    children: null,
  },
  render: function Render() {
    const [active, setActive] = useState('fotos');
    return (
      <div className="min-h-screen bg-background">
        <Tabbar
          tabs={[
            { key: 'fotos', label: 'Fotos', count: 24 },
            { key: 'recuerdos', label: 'Recuerdos', count: 3 },
          ]}
          active={active}
          onChange={setActive}
        >
          {active === 'fotos' && <Panel>Fotos del capítulo</Panel>}
          {active === 'recuerdos' && <Panel>Recuerdos de este capítulo</Panel>}
        </Tabbar>
      </div>
    );
  },
};

// Uso real en PersonaDetailScreen.tsx: 2 pestañas, una sin badge de recuento (Biografía).
export const PersonaDetailTwoTabs: Story = {
  args: {
    tabs: [
      { key: 'biografia', label: 'Biografía' },
      { key: 'fotos', label: 'Fotos', count: 12 },
    ],
    active: 'biografia',
    onChange: () => {},
    children: null,
  },
  render: function Render() {
    const [active, setActive] = useState('biografia');
    return (
      <div className="min-h-screen bg-background">
        <Tabbar
          tabs={[
            { key: 'biografia', label: 'Biografía' },
            { key: 'fotos', label: 'Fotos', count: 12 },
          ]}
          active={active}
          onChange={setActive}
        >
          {active === 'biografia' && <Panel>Biografía de la persona</Panel>}
          {active === 'fotos' && <Panel>Fotos etiquetadas</Panel>}
        </Tabbar>
      </div>
    );
  },
};

// Uso real en PhotosView.tsx durante el modo de selección de fotos: la franja de pestañas
// se oculta (hideStrip) pero el contenido conserva el swipe horizontal.
export const HiddenStripDuringSelection: Story = {
  args: {
    tabs: [
      { key: 'fotos', label: 'Fotos', count: 24 },
      { key: 'recuerdos', label: 'Recuerdos', count: 3 },
    ],
    active: 'fotos',
    onChange: () => {},
    hideStrip: true,
    children: null,
  },
  render: function Render() {
    const [active, setActive] = useState('fotos');
    return (
      <div className="min-h-screen bg-background">
        <Tabbar
          tabs={[
            { key: 'fotos', label: 'Fotos', count: 24 },
            { key: 'recuerdos', label: 'Recuerdos', count: 3 },
          ]}
          active={active}
          onChange={setActive}
          hideStrip
        >
          {active === 'fotos' && <Panel>3 fotos seleccionadas — franja de pestañas oculta durante la selección</Panel>}
          {active === 'recuerdos' && <Panel>Recuerdos de este capítulo</Panel>}
        </Tabbar>
      </div>
    );
  },
};
