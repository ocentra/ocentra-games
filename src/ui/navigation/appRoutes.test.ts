import { describe, expect, it } from 'vitest';
import { buildCardGameTemplatePath, buildGamePlayPath } from './appRoutes';

describe('appRoutes', () => {
  it('builds the standalone card game template path', () => {
    expect(buildCardGameTemplatePath()).toBe('/games/cardgame/template');
  });

  it('builds the playable game path without preview mode', () => {
    expect(buildGamePlayPath('claim')).toBe('/games/claim/play');
  });
});
