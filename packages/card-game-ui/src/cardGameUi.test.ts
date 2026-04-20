import { describe, expect, it } from 'vitest';
import { CardGameDesignStudioWorkbench } from './CardGameDesignStudioWorkbench';
import { CardGamePreviewSurface } from './CardGamePreviewSurface';

describe('card-game-ui exports', () => {
  it('exports renderable React components', () => {
    expect(typeof CardGamePreviewSurface).toBe('function');
    expect(typeof CardGameDesignStudioWorkbench).toBe('function');
  });
});
