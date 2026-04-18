import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GameBackground from './GameBackground';

describe('GameBackground', () => {
  it('renders eight paired symbol groups', () => {
    const { container } = render(<GameBackground />);

    expect(container.querySelectorAll('.game-background__pair')).toHaveLength(8);
    expect(container.querySelectorAll('.game-background__pair-card')).toHaveLength(16);
  });
});
