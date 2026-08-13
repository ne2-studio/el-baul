// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TvSessionRoute } from './TvSessionRoute';
import { api } from '@/api';
import { TvSessionContent } from '@/types';

vi.mock('@/api', () => ({
  api: {
    tvSessions: {
      getContent: vi.fn(),
    },
  },
}));

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/tv/session-token']}>
      <Routes>
        <Route path="/tv/:token" element={<TvSessionRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

function buildContent(overrides: Partial<ReturnType<typeof buildRawContent>> = {}) {
  return new TvSessionContent({ ...buildRawContent(), ...overrides });
}

function buildRawContent() {
  return {
    baulName: 'Baúl de los Pardal',
    photos: [
      {
        id: 'photo-1',
        imageUrl: 'https://imgproxy.test/photo-1.jpg',
        dateYear: 1998,
        dateMonth: 7,
        dateDay: 15,
        chapterName: 'Verano en la playa',
        personaNames: ['Rosa', 'Marta'],
        quote: 'Aprendiste a nadar',
        quoteAuthor: 'Marta',
      },
      {
        id: 'photo-2',
        imageUrl: 'https://imgproxy.test/photo-2.jpg',
        dateYear: null,
        dateMonth: null,
        dateDay: null,
        chapterName: null,
        personaNames: [],
        quote: null,
        quoteAuthor: null,
      },
    ],
  };
}

describe('TvSessionRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the expired-session screen when the session no longer resolves', async () => {
    vi.mocked(api.tvSessions.getContent).mockRejectedValue(new Error('not found'));

    renderRoute();

    expect(await screen.findByText('La sesión ha caducado')).toBeInTheDocument();
  });

  it('shows the empty-baúl screen when the baúl has no photos', async () => {
    vi.mocked(api.tvSessions.getContent).mockResolvedValue(buildContent({ photos: [] }));

    renderRoute();

    expect(await screen.findByText('Este baúl no tiene fotos todavía')).toBeInTheDocument();
  });

  it('shows the first photo and the baúl name once loaded', async () => {
    vi.mocked(api.tvSessions.getContent).mockResolvedValue(buildContent());

    renderRoute();

    expect(await screen.findByText('Baúl de los Pardal')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('navigates between photos with the arrow keys and toggles context with Enter', async () => {
    vi.mocked(api.tvSessions.getContent).mockResolvedValue(buildContent());

    renderRoute();
    await screen.findByText('1 / 2');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(await screen.findByText('2 / 2')).toBeInTheDocument();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(await screen.findByText('1 / 2')).toBeInTheDocument();

    expect(screen.queryByText('Verano en la playa')).not.toBeInTheDocument();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(await screen.findByText('Verano en la playa')).toBeInTheDocument();
    expect(screen.getByText('Rosa · Marta')).toBeInTheDocument();
    expect(screen.getByText('"Aprendiste a nadar" — Marta')).toBeInTheDocument();
  });
});
