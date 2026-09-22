// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MyAccountScreen } from './MyAccountScreen';

vi.mock('@/features/profile/native/appVersion', () => ({
  getAppVersion: vi.fn().mockResolvedValue('1.2.3 (45)'),
}));

function renderScreen() {
  return render(
    <MyAccountScreen
      onBack={vi.fn()}
      onNavigateToProfile={vi.fn()}
      onNavigateToNotifications={vi.fn()}
      onSignOut={vi.fn()}
    />
  );
}

describe('MyAccountScreen', () => {
  it('shows the app version once it resolves', async () => {
    renderScreen();

    expect(await screen.findByText('Versión 1.2.3 (45)')).toBeInTheDocument();
  });
});
