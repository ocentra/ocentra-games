import { describe, it, expect } from 'vitest';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';

describe('deck asset validation', () => {
  it('validateAssetFile: accepts Deck asset with required fields', () => {
    const result = validateAssetFile({
      system: {
        guid: 'ddc4484b-4ed7-47c7-8f0a-2ea23a4c5191',
        assetType: 'Deck',
        schemaVersion: 1,
        displayName: 'Standard 32',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Decks/Standard 32.asset',
      },
      data: {
        name: 'Standard 32',
        supportedTriples: [
          {
            deckType: 'Standard 32',
            suitSet: 'French',
            rankSet: 'Stripped_32',
          },
        ],
        cardTemplates: [
          {
            path: 'Resources/GameMode/CardGames/Cards/Standard 32/2_of_spades.asset',
            guid: '699ffc10-8756-4662-80d6-e4f2dcd62e66',
            assetType: 'Card',
            displayName: '2_of_spades',
            resourceEntryType: 'AssetResourceEntry',
          },
        ],
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/StandardCardRanking.asset',
          guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
          assetType: 'CardRanking',
          displayName: 'StandardCardRanking',
          resourceEntryType: 'AssetResourceEntry',
        },
        imageSourceFolderPath: 'Resources/GameMode/CardGames/Images',
        cardOutputPath: 'Resources/GameMode/CardGames/Cards/NormalDeck',
        backCardSourceFolderPath: 'Resources/GameMode/CardGames/Images/Extras',
        backCardHash: '',
      },
    });

    expect(result.success).toBe(true);
  });

  it('validateAssetFile: rejects Deck asset missing cardRankingAsset', () => {
    const result = validateAssetFile({
      system: {
        guid: 'ddc4484b-4ed7-47c7-8f0a-2ea23a4c5191',
        assetType: 'Deck',
        schemaVersion: 1,
        displayName: 'Standard 32',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Decks/Standard 32.asset',
      },
      data: {
        name: 'Standard 32',
        supportedTriples: [
          {
            deckType: 'Standard 32',
            suitSet: 'French',
            rankSet: 'Stripped_32',
          },
        ],
        cardTemplates: [
          {
            path: 'Resources/GameMode/CardGames/Cards/Standard 32/2_of_spades.asset',
            guid: '699ffc10-8756-4662-80d6-e4f2dcd62e66',
            assetType: 'Card',
            displayName: '2_of_spades',
            resourceEntryType: 'AssetResourceEntry',
          },
        ],
        imageSourceFolderPath: 'Resources/GameMode/CardGames/Images',
        cardOutputPath: 'Resources/GameMode/CardGames/Cards/NormalDeck',
        backCardSourceFolderPath: 'Resources/GameMode/CardGames/Images/Extras',
        backCardHash: '',
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map(i => i.path.join('.'));
    expect(paths).toContain('data.cardRankingAsset');
  });

  it('validateAssetFile: rejects Deck asset when a cardTemplate path is not .asset', () => {
    const result = validateAssetFile({
      system: {
        guid: 'ddc4484b-4ed7-47c7-8f0a-2ea23a4c5191',
        assetType: 'Deck',
        schemaVersion: 1,
        displayName: 'Standard 32',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Decks/Standard 32.asset',
      },
      data: {
        name: 'Standard 32',
        supportedTriples: [
          {
            deckType: 'Standard 32',
            suitSet: 'French',
            rankSet: 'Stripped_32',
          },
        ],
        cardTemplates: [
          {
            path: 'Resources/GameMode/CardGames/Cards/Standard 32/2_of_spades.png',
            guid: '699ffc10-8756-4662-80d6-e4f2dcd62e66',
            assetType: 'Card',
            displayName: '2_of_spades',
            resourceEntryType: 'AssetResourceEntry',
          },
        ],
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/StandardCardRanking.asset',
          guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
          assetType: 'CardRanking',
          displayName: 'StandardCardRanking',
          resourceEntryType: 'AssetResourceEntry',
        },
        imageSourceFolderPath: 'Resources/GameMode/CardGames/Images',
        cardOutputPath: 'Resources/GameMode/CardGames/Cards/NormalDeck',
        backCardSourceFolderPath: 'Resources/GameMode/CardGames/Images/Extras',
        backCardHash: '',
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const messages = result.error.issues.map(i => i.message);
    expect(messages).toContain('Card template path must end in .asset');
  });

  it('validateAssetFile: accepts Deck asset with shared cardComposition entries', () => {
    const result = validateAssetFile({
      system: {
        guid: '0fd73bf7-5aa7-4b25-a6c6-a6d1f80ea25d',
        assetType: 'Deck',
        schemaVersion: 1,
        displayName: 'Double 52',
        category: 'Game',
        treePath: 'Resources/GameMode/CardGames/Decks/Double 52.asset',
      },
      data: {
        name: 'Double 52',
        supportedTriples: [
          {
            deckType: 'Double 52',
            suitSet: 'French',
            rankSet: 'Standard_52',
          },
        ],
        cardTemplates: [],
        cardComposition: [
          {
            cardTemplate: {
              path: 'Resources/GameMode/CardGames/Cards/Standard 52 + Joker(s)/2_of_spades.asset',
              guid: '699ffc10-8756-4662-80d6-e4f2dcd62e66',
              assetType: 'Card',
              displayName: '2_of_spades',
              resourceEntryType: 'AssetResourceEntry',
            },
            copies: 2,
          },
        ],
        cardRankingAsset: {
          path: 'Resources/GameMode/CardGames/CardRanking/French_Double_52.asset',
          guid: 'b13de227-d9b8-41df-8e92-2a3db4b4d6cb',
          assetType: 'CardRanking',
          displayName: 'French_Double_52',
          resourceEntryType: 'AssetResourceEntry',
        },
        imageSourceFolderPath: 'Resources/GameMode/CardGames/Images',
        cardOutputPath: 'Resources/GameMode/CardGames/Cards/Double 52',
        backCardSourceFolderPath: 'Resources/GameMode/CardGames/Images/Extras',
        backCardHash: '',
      },
    });

    expect(result.success).toBe(true);
  });
});

