import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAwareRoutes } from './PlatformAwareRoutes';

vi.mock('@/ui/platform/usePlatformUI', () => ({
  usePlatformUI: () => ({
    shell: 'web',
  }),
}));

vi.mock('@/adapters/solana/wallet/WalletProviderGate', () => ({
  WalletProviderGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/ui/components/GameScreen/CardGameScreen/GameScreen', () => ({
  default: () => <div data-testid="legacy-card-game-shell" />,
}));

describe('PlatformAwareRoutes', () => {
  it('renders the card game template route', async () => {
    render(
      <MemoryRouter initialEntries={['/games/cardgame/template']}>
        <PlatformAwareRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('legacy-card-game-shell')).toBeTruthy();
  });
});
