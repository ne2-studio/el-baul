// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingRoute } from './OnboardingRoute';
import { api } from '@/api';
import { markOnboardingSeen } from '@/features/auth/useCases';
import { useAuth } from 'react-oidc-context';
import type { PersonaInvitePreview } from '@/types';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/api', () => ({
  api: {
    personaInvites: {
      getPreview: vi.fn(),
    },
  },
}));

vi.mock('@/features/auth/useCases', () => ({
  markOnboardingSeen: vi.fn(),
}));

vi.mock('@/features/auth/components/OnboardingCarousel', () => ({
  OnboardingCarousel: ({
    steps,
    onComplete,
    onSkip,
  }: {
    steps: Array<{ title: string; description: string | null; ctaLabel?: string }>;
    onComplete: () => void;
    onSkip: () => void;
  }) => (
    <main>
      <h1>{steps[0]?.title}</h1>
      {steps[0]?.description && <p>{steps[0].description}</p>}
      <button type="button" onClick={onComplete}>{steps[0]?.ctaLabel ?? 'Continuar'}</button>
      <button type="button" onClick={onSkip}>Saltar</button>
    </main>
  ),
}));

vi.mock('@/features/auth/components/OnboardingSteps', () => ({
  buildOnboardingSteps: vi.fn((finalStep) => [
    {
      title: finalStep.title,
      description: finalStep.description,
      ctaLabel: finalStep.ctaLabel,
      illustration: null,
    },
  ]),
}));

vi.mock('@/features/auth/components/OnboardingInvitePreviewSteps', () => ({
  buildInvitePreviewSteps: vi.fn((preview: PersonaInvitePreview) => [
    {
      title: preview.name,
      description: 'Te han invitado a formar parte de este Baúl.',
      ctaLabel: 'Entrar al Baúl',
      illustration: null,
    },
  ]),
}));

function LocationProbe() {
  const location = useLocation();
  return <div>{location.pathname}{location.search}</div>;
}

function renderRoute(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OnboardingRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(api.personaInvites.getPreview).mockResolvedValue({
      baulId: 'baul-1',
      name: 'Baúl de los García',
      previewPhotos: [],
      personaAvatarUrls: [],
    } as PersonaInvitePreview);
  });

  it('uses the generic signup onboarding and marks it as seen before creating the first baúl', async () => {
    const user = userEvent.setup();
    renderRoute('/onboarding');

    expect(screen.getByRole('heading', { name: 'Crea vuestro Baúl' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Crear mi Baúl' }));

    expect(markOnboardingSeen).toHaveBeenCalledTimes(1);
    expect(screen.getByText('/baules/nuevo')).toBeInTheDocument();
  });

  it('uses the personalized invite preview without permanently marking onboarding as seen', async () => {
    const user = userEvent.setup();
    renderRoute('/onboarding?baulNombre=Familia&redirectTo=%2Finvitacion%2Fbaul%2Finvite-token%2Faceptar&token=invite-token');

    expect(await screen.findByRole('heading', { name: 'Baúl de los García' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Entrar al Baúl' }));

    expect(api.personaInvites.getPreview).toHaveBeenCalledWith('invite-token');
    expect(markOnboardingSeen).not.toHaveBeenCalled();
    expect(screen.getByText('/invitacion/baul/invite-token/aceptar')).toBeInTheDocument();
  });

  it('falls back to the generic invite final step when preview loading fails', async () => {
    vi.mocked(api.personaInvites.getPreview).mockRejectedValue(new Error('revoked'));

    renderRoute('/onboarding?baulNombre=Familia&redirectTo=%2Finvitacion%2Fbaul%2Finvite-token%2Faceptar&token=invite-token');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Te han invitado a formar parte de este Baúl' })).toBeInTheDocument();
    });
    expect(screen.getByText('Te unirás al Baúl "Familia" para añadir fotos, recuerdos y formar parte de vuestra historia familiar.')).toBeInTheDocument();
  });

  it('redirects anonymous users to login with the intended next target encoded', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    renderRoute('/onboarding?redirectTo=%2Finvitacion%2Fbaul%2Finvite-token%2Faceptar');

    await user.click(screen.getByRole('button', { name: 'Entrar al Baúl' }));

    expect(markOnboardingSeen).not.toHaveBeenCalled();
    expect(screen.getByText('/?redirectTo=%2Finvitacion%2Fbaul%2Finvite-token%2Faceptar')).toBeInTheDocument();
  });
});
