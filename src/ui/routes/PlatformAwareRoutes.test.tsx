import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PublicRouteKey, PublicRoutePath } from '@ocentra/endpoint-domain/constants/public-routes';
import { PlatformAwareRoutes } from './PlatformAwareRoutes';

vi.mock('@/ui/platform/usePlatformUI', () => ({
  usePlatformUI: () => ({
    shell: 'web',
  }),
}));

vi.mock('@/adapters/solana/wallet/WalletProviderGate', () => ({
  WalletProviderGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/ui/components/GameScreen/CardGameScreen/CardGamePreviewHarness', () => ({
  CardGamePreviewHarness: () => <div data-testid="card-game-preview-harness" />,
}));

vi.mock('@/components/MainApp', () => ({
  default: () => <div data-testid="main-app" />,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="route-path">{location.pathname}</div>;
}

describe('PlatformAwareRoutes', () => {
  it('renders the card game template route', async () => {
    render(
      <MemoryRouter initialEntries={['/games/cardgame/template']}>
        <PlatformAwareRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('card-game-preview-harness')).toBeTruthy();
  });

  it.each([
    PublicRoutePath[PublicRouteKey.GameLeaderboard],
    PublicRoutePath[PublicRouteKey.AiBenchmarkLeaderboard],
  ])('redirects retired leaderboard route %s to the canonical leaderboard', async (routePath) => {
    render(
      <MemoryRouter initialEntries={[routePath.replace(':gameId', 'claim')]}>
        <PlatformAwareRoutes />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('route-path').textContent).toBe(PublicRoutePath[PublicRouteKey.Leaderboard]);
    });
  });
});
