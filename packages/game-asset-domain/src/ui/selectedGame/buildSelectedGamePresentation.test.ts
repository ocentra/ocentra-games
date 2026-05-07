import { describe, expect, it } from 'vitest';
import { buildSelectedGamePresentation } from '@/ui/selectedGame/buildSelectedGamePresentation';

const claimLikeBundle = {
  layout: {
    data: {
      contentPlan: {
        tabs: [
          { id: 'about', enabled: true, label: 'About', source: 'gameInfo', maxChunks: 6 },
          { id: 'rules', enabled: true, label: 'Rules', source: 'rules', maxChunks: 6 },
          { id: 'deck', enabled: true, label: 'Deck', source: 'deckModel,deck', maxChunks: 4 },
          { id: 'ranking', enabled: true, label: 'Ranking', source: 'ranking,scoring', maxChunks: 4 },
          { id: 'scoring', enabled: true, label: 'Scoring', source: 'scoring,validationFixtures', maxChunks: 5 },
          { id: 'strategy', enabled: true, label: 'Strategy', source: 'strategy', maxChunks: 5 },
          { id: 'systems', enabled: true, label: 'Systems', source: 'mechanics,actions,gameInfo', maxChunks: 5 },
        ],
      },
    },
  },
  gameMode: {
    data: {
      displayName: 'Claim',
      minPlayers: 4,
      maxPlayers: 4,
      turnDuration: 60,
      deckAsset: { displayName: 'Standard 52', guid: 'deck-guid', assetType: 'Deck' },
      rankingAsset: { displayName: 'Standard Ranking', guid: 'ranking-guid', assetType: 'DeckRanking' },
      bannerImage: 'banner-hash',
    },
  },
  gameInfo: {
    data: {
      hero: { title: 'CLAIM', subtitle: 'Declare a suit. Build the run. Survive the debt.' },
      tagline: 'Declare your suit. Build your hand.',
      tags: ['Card Game', 'Strategy'],
      Player: 'Collect one suit and survive debt.',
      origin: 'Ocentra',
      originName: 'Claim',
      alsoKnownAs: ['Claim Hoarder'],
      historyContent: {
        origins: 'Claim was created for the shared mechanics table.',
        originCountries: ['Ocentra'],
        timeline: ['Prototype table', 'Playable rules'],
      },
      setupContent: {
        players: 'Four players sit at a fixed table.',
        deck: 'Standard 52-card French deck.',
        dealing: 'Deal three cards to each player.',
      },
      variationsContent: {
        list: [
          { name: 'Fast Claim', description: 'Shorter target score.' },
        ],
      },
      sourcesContent: {
        primary: [{ name: 'scraper provenance', url: 'https://source.invalid' }],
      },
      sections: [
        {
          tabLabel: 'How Claim Plays',
          pages: [
            {
              title: 'Overview',
              subtitle: 'Duplicate public overview',
              content: [{ text: 'This duplicate overview should not create another public tab.' }],
            },
            {
              title: 'Setup',
              subtitle: 'How the hand starts',
              content: [{ text: 'Deal three cards to each player.' }],
            },
            {
              title: 'Sources And Provenance',
              subtitle: 'Editor-only audit',
              content: [{ text: 'scraper audit url https://source.invalid should stay out of public chunks.' }],
            },
          ],
        },
      ],
      mechanicsContract: {
        mechanicsId: 'claim-hoarder',
        mechanicsVersion: '2.0.0',
        familyKernel: 'claim',
        executorId: 'claim.hoarder.v1',
        strategyExecutorId: 'claim.bot.deterministic.v1',
      },
    },
  },
  rules: {
    data: {
      playerCount: { min: 4, max: 4 },
      setup: { deck: 'standard_52_french', dealCountPerPlayer: 3 },
      turnRules: { timerSeconds: 60 },
      showdownRules: { minimumFinalScore: 27 },
      ruleGroups: [{ id: 'setup', label: 'Setup', ruleIds: ['deal'] }],
      rules: [{ id: 'deal', text: 'Deal three cards.' }],
    },
  },
  scoring: {
    data: {
      targetScore: 27,
      description: 'Declared suit scores positive.',
      scoringFormula: 'Final score = declared - debt.',
      scoringDirection: 'higher_is_better',
      cardValues: { A: 14, K: 13 },
      rankingAsset: { displayName: 'Standard Ranking', guid: 'ranking-guid', assetType: 'DeckRanking' },
    },
  },
  strategy: {
    data: {
      Player: '- Track discards.\n- Declare before debt gets expensive.',
      botProfile: {
        preferredSuitPolicy: 'highest_same_suit_projected_score',
        declarationPolicy: 'declare when ready',
        discardPolicy: 'discard off-suit liability',
        showdownPolicy: 'call at threshold',
      },
    },
  },
  deckModel: {
    data: {
      deckType: 'Standard 52',
      deckCount: 1,
      initialHandSize: 3,
      assetRefs: {
        deck: { displayName: 'Standard 52', guid: 'deck-guid', assetType: 'Deck' },
        ranking: { displayName: 'Standard Ranking', guid: 'ranking-guid', assetType: 'DeckRanking' },
      },
      drawConfig: { sources: ['stock', 'discard'] },
      discardConfig: { maxDiscardPerTurn: 1 },
      handRanks: {
        valueSystem: 'ace_high_circular',
        rankCycle: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        aceAdjacency: ['king', 'two'],
      },
    },
  },
  validationFixtures: {
    data: {
      validationSuites: [
        {
          fixtures: [
            {
              title: 'A K Q of Spades',
              purpose: 'scoring',
              expectedFinalScore: 117,
              explanation: '(14 + 13 + 12) * 3 = 117.',
            },
          ],
        },
      ],
    },
  },
  actions: {
    data: {
      actionModel: { actionIds: ['take_stock', 'discard_card'] },
    },
  },
  images: {
    data: {
      slides: [{ label: 'Claim frame', imageHash: 'image-hash' }, { label: 'Claim table', imageHash: 'image-hash-2' }],
      logoImageHash: 'logo-hash',
    },
  },
};

describe('buildSelectedGamePresentation', () => {
  it('builds all selected-game tabs in the required order', () => {
    const presentation = buildSelectedGamePresentation(claimLikeBundle);

    expect(presentation.tabs.map((tab) => tab.label)).toEqual([
      'About',
      'Rules',
      'Deck',
      'Ranking',
      'Scoring',
      'Strategy',
      'Systems',
    ]);
    expect(presentation.tabs.every((tab) => tab.chunks.length > 0)).toBe(true);
  });

  it('does not expose source or provenance content as public chunks', () => {
    const presentation = buildSelectedGamePresentation(claimLikeBundle);
    const publicText = presentation.tabs
      .flatMap((tab) => tab.chunks)
      .flatMap((chunk) => [chunk.title, ...chunk.body, ...chunk.bullets])
      .join(' ');

    expect(publicText).not.toContain('scraper');
    expect(publicText).not.toContain('source.invalid');
    expect(publicText).not.toContain('provenance');
  });

  it('deduplicates about chunks while preserving how-to-play pages', () => {
    const presentation = buildSelectedGamePresentation(claimLikeBundle);
    const aboutTitles = presentation.tabs.find((tab) => tab.id === 'about')?.chunks.map((chunk) => chunk.title) ?? [];

    expect(aboutTitles.filter((title) => title === 'Overview')).toHaveLength(1);
    expect(aboutTitles).toEqual(expect.arrayContaining(['History', 'Origin', 'How To Play', 'Variants']));
    expect(aboutTitles).not.toContain('Sources And Provenance');
  });

  it('keeps all authored carousel image refs available for side A', () => {
    const presentation = buildSelectedGamePresentation(claimLikeBundle);

    expect(presentation.sideA.media.map((ref) => ref.imageHash).filter(Boolean)).toEqual([
      'image-hash',
      'image-hash-2',
      'banner-hash',
      'logo-hash',
    ]);
  });

  it('degrades missing assets to empty sections without crashing', () => {
    const presentation = buildSelectedGamePresentation({});

    expect(presentation.tabs.map((tab) => tab.id)).toEqual([
      'about',
      'rules',
      'deck',
      'ranking',
      'scoring',
      'strategy',
      'systems',
    ]);
    expect(presentation.tabs.flatMap((tab) => tab.chunks)).toEqual([]);
  });
});
