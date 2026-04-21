import { describe, expect, it } from 'vitest';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { buildTreeFromPaths } from './pathBasedTreeBuilder';

function makeAsset(path: string, guid: string): ResourceEntry {
  return {
    path,
    displayName: path.split('/').pop()?.replace(/\.asset$/, '') ?? path,
    guid,
  } as unknown as ResourceEntry;
}

describe('buildTreeFromPaths', () => {
  it('keeps the full tree shape by default', () => {
    const tree = buildTreeFromPaths([
      makeAsset('Resources/GameMode/CardGames/Games/Claim/claim.asset', 'claim-guid'),
      makeAsset('Resources/GameMode/CardGames/Games/briscola/briscola.asset', 'briscola-guid'),
    ]);

    expect(tree.rootNode.name).toBe('Resources');
    expect(tree.allNodes.has('virtual:GameRegistry')).toBe(true);
    expect(tree.allNodes.has('virtual:DeckManager')).toBe(true);
  });

  it('can build a Games-only subtree rooted at the Games folder', () => {
    const tree = buildTreeFromPaths([
      makeAsset('Resources/GameMode/CardGames/Games/Claim/claim.asset', 'claim-guid'),
      makeAsset('Resources/GameMode/CardGames/Games/briscola/briscola.asset', 'briscola-guid'),
      makeAsset('Resources/Pages/Home/ComingSoon.asset', 'coming-soon-guid'),
    ], {
      rootPath: 'GameMode/CardGames/Games',
      rootLabel: 'Games',
    });

    expect(tree.rootNode.name).toBe('Games');
    expect(tree.rootNode.path).toBe('Resources/GameMode/CardGames/Games');
    expect(tree.rootNode.children).toEqual([
      'folder:GameMode/CardGames/Games/Claim',
      'folder:GameMode/CardGames/Games/briscola',
    ]);
    expect(tree.allNodes.has('virtual:GameRegistry')).toBe(false);
    expect(tree.allNodes.has('virtual:DeckManager')).toBe(false);
    expect(tree.allNodes.has('coming-soon-guid')).toBe(false);
  });
});
