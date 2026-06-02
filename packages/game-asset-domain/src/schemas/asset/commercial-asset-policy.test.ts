import { describe, expect, it } from 'vitest';
import { getCommercialAssetViolation } from '@/schemas/asset/commercial-asset-policy';

describe('commercial asset policy', () => {
  it('flags commercial deck assets by triple', () => {
    expect(
      getCommercialAssetViolation(
        'Resources/GameMode/CardGames/Decks/Rook 56.asset',
        'Deck',
        {
          supportedTriples: [
            {
              deckType: 'Rook 56',
              suitSet: 'Rook_colors',
              rankSet: 'Rook_1_14',
            },
          ],
        },
      ),
    ).toContain('commercial');
  });

  it('allows path-only commercial checks to defer until asset data is available', () => {
    expect(
      getCommercialAssetViolation(
        'Resources/GameMode/CardGames/Cards/Whot 54/whot_triangles_1.asset',
      ),
    ).toBeNull();
  });

  it('allows explicit commercial placeholder deck assets', () => {
    expect(
      getCommercialAssetViolation(
        'Resources/GameMode/CardGames/Decks/Whot 54.asset',
        'Deck',
        {
          commercialPlaceholderOnly: true,
          supportedTriples: [
            {
              deckType: 'Whot 54',
              suitSet: 'Whot',
              rankSet: 'Whot',
            },
          ],
        },
      ),
    ).toBeNull();
  });

  it('flags commercial card folders without the placeholder marker', () => {
    expect(
      getCommercialAssetViolation(
        'Resources/GameMode/CardGames/Cards/Whot 54/whot_triangles_1.asset',
        'Card',
        {
          rankingAsset: {
            path: 'Resources/GameMode/CardGames/CardRanking/whot_54.asset',
          },
        },
      ),
    ).toContain('commercial');
  });

  it('does not flag safe shared-family assets', () => {
    expect(
      getCommercialAssetViolation(
        'Resources/GameMode/CardGames/Decks/Standard 52 + Joker(s).asset',
        'Deck',
        {
          supportedTriples: [
            {
              deckType: 'Standard 52 + Joker(s)',
              suitSet: 'French',
              rankSet: 'Standard_52',
            },
          ],
        },
      ),
    ).toBeNull();
  });
});
