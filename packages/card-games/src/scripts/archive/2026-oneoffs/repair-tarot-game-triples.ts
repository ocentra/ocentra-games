#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { PROCESSED_GAMES_DIR } from '@/paths';

type Triple = {
  deckType: string;
  suitSet: string;
  rankSet: string;
};

type DescriptionSet = {
  deckDescription: string;
  suitDescription: string;
  rankDescription: string;
};

type GameUpdate = {
  slug: string;
  triple: Triple;
  descriptions: DescriptionSet;
  overviewDeck?: string;
  setupDeck?: string;
};

const DESCRIPTION_BY_KEY: Record<string, DescriptionSet> = {
  'Tarot 78\0French\0Tarot_78': {
    deckDescription:
      'A 78-card French Tarot deck with 21 numbered trumps plus the Excuse and four French suits. Each suit ranks King, Queen, Cavalier, Jack, 10 down to 1.',
    suitDescription:
      'Four French suits: Spades, Hearts, Diamonds, and Clubs. Trumps form a separate permanent trump suit numbered 1 to 21, with the Excuse acting as the Fool.',
    rankDescription:
      'Suit cards rank King, Queen, Cavalier, Jack, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1. The three oudler cards are trump 1, trump 21, and the Excuse.',
  },
  'Tarot 78\0French_tarock\0Tarot_78': {
    deckDescription:
      'A 78-card French-suited historical tarock deck with 21 numbered trumps plus the Fool and four French suits used for older Alpine tarock games.',
    suitDescription:
      'Four French suits: Spades, Hearts, Diamonds, and Clubs. Trumps are permanent and separate from the suit cards.',
    rankDescription:
      'Suit cards use tarot courts King, Queen, Cavalier, Jack with numeral cards 10 down to 1. Trumps run from 1 to 21 plus the Fool.',
  },
  'Tarot 78\0Tarot_de_Marseille\0Tarot_78': {
    deckDescription:
      'A 78-card Tarot de Marseille deck with 21 trumps plus the Fool and four Latin suits: Swords, Batons, Cups, and Coins.',
    suitDescription:
      'The long suits are Swords and Batons; the round suits are Cups and Coins. Trumps are separate from the four suited sequences.',
    rankDescription:
      'Each suit has King, Queen, Cavalier, Jack, and ten pip cards. In Cups and Coins the Ace is highest among pips; in Swords and Batons the 10 is highest among pips.',
  },
  'Tarot 78\0Swiss_1JJ\0Tarot_78': {
    deckDescription:
      'A 78-card Swiss 1JJ tarot deck with Italian suits, 21 trumps, and the Fool, used for full Swiss tarot games such as Troccas.',
    suitDescription:
      'The suits are Swords, Batons, Cups, and Coins. This is the Swiss 1JJ family derived from Marseille/Besancon tarot rather than the French Tarot Nouveau pack.',
    rankDescription:
      'Each suit has King, Queen, Cavalier, Jack, and ten pip cards. Trumps run from 1 to 21 with the Fool outside the numbering.',
  },
  'Tarot 78\0Tarocco_Piemontese\0Tarot_78': {
    deckDescription:
      'A 78-card Tarocco Piemontese style tarot deck with 21 trumps plus the Matto and four Italian suits: Swords, Batons, Cups, and Coins.',
    suitDescription:
      'The suits are Swords, Batons, Cups, and Coins. This is the historical Italian-suited family used for Piedmontese tarocchi before later local adoption of French-suited tarot packs.',
    rankDescription:
      'Each suit has King, Queen, Cavalier, Jack, and ten pip cards. Trumps run from 1 to 21 with the Matto outside the numbering.',
  },
  'Tarot 66\0French_tarock\0Tarot_66': {
    deckDescription:
      'A 66-card French-suited tarock deck with 21 trumps plus the Fool and 44 suit cards. Black suits keep King, Queen, Cavalier, Jack, 10 down to 4; red suits keep King, Queen, Cavalier, Jack, Ace down to 7.',
    suitDescription:
      'Spades and Clubs are the long black suits; Hearts and Diamonds are the round red suits. The two colour groups keep different pip subsets.',
    rankDescription:
      'Courts are King, Queen, Cavalier, and Jack. The long black suits rank 10 down to 4 beneath the courts; the round red suits rank Ace down to 7 beneath the courts.',
  },
  'Tarot 66\0Tarot_de_Marseille\0Tarot_66': {
    deckDescription:
      'A 66-card Tarot de Marseille pack with 21 trumps plus the Fool and 44 Latin-suited cards. Swords and Batons keep King, Queen, Cavalier, Jack, 10 down to 4; Cups and Coins keep King, Queen, Cavalier, Jack, Ace down to 7.',
    suitDescription:
      'Swords and Batons are the long suits; Cups and Coins are the round suits. The round and long suits keep different pip ranges in the reduced 66-card pack.',
    rankDescription:
      'Courts are King, Queen, Cavalier, and Jack. Long suits use 10 to 4 as their pips; round suits use Ace to 7 as their pips.',
  },
  'Tarot 54\0Industrie_und_Glueck\0Tarot_54': {
    deckDescription:
      'A 54-card Industrie und Glück tarock deck with 21 numbered trumps plus the Skus and 32 suit cards. Black suits keep King, Queen, Cavalier, Jack, 10, 9, 8, 7; red suits keep King, Queen, Cavalier, Jack, Ace, 2, 3, 4.',
    suitDescription:
      'Four French suits are divided into black suits (Spades and Clubs) and red suits (Hearts and Diamonds), each with its own reduced pip sequence.',
    rankDescription:
      'Courts are King, Queen, Cavalier, and Jack. Black suits continue with 10, 9, 8, 7; red suits continue with Ace, 2, 3, 4. Trumps run from 1 to 21 plus the Skus.',
  },
  'Tarot 54\0Cego\0Tarot_54': {
    deckDescription:
      'A 54-card Cego-family tarock pack with 21 numbered trumps plus the Fool and 32 French-suited cards, using the same reduced suit structure as the Austrian 54-card tarock deck.',
    suitDescription:
      'Four French suits split into black and red colour groups, with different reduced pip sequences beneath the courts.',
    rankDescription:
      'Black suits keep 10, 9, 8, 7 under King, Queen, Cavalier, Jack; red suits keep Ace, 2, 3, 4 under the same courts. Trumps run from 1 to 21 plus the Fool.',
  },
  'Tarot 42\0Industrie_und_Glueck\0Tarot_42': {
    deckDescription:
      'A 42-card Industrie und Glück tarock deck with 21 numbered trumps plus the Skus and 20 suit cards. Black suits keep King, Queen, Cavalier, Jack, 10; red suits keep King, Queen, Cavalier, Jack, Ace.',
    suitDescription:
      'Spades and Clubs are the black suits; Hearts and Diamonds are the red suits. Each colour group keeps only five suited cards.',
    rankDescription:
      'Each suit contains King, Queen, Cavalier, Jack, and one pip card. The black suits keep 10; the red suits keep Ace. Trumps run from 1 to 21 plus the Skus.',
  },
  'Tarot 40\0Industrie_und_Glueck\0Tarot_40': {
    deckDescription:
      'A 40-card Industrie und Glück tarock pack used for Zwanzigerrufen: 20 tarocks and 20 suit cards. The tarocks are Skus, I, and IV through XXI.',
    suitDescription:
      'Four French suits remain in reduced form: black suits keep King, Queen, Cavalier, Jack, 10 while red suits keep King, Queen, Cavalier, Jack, Ace.',
    rankDescription:
      'Trumps are Skus, I, and IV through XXI. In the suits, black cards keep 10 as the only pip and red cards keep Ace as the only pip beneath the courts.',
  },
  'Tarot 62\0Swiss_1JJ\0Tarot_62': {
    deckDescription:
      'A 62-card reduced Swiss 1JJ tarot deck with 21 trumps plus the Fool and 40 suit cards, formed by removing Ace through 4 from Swords and Batons and 7 through 10 from Cups and Coins.',
    suitDescription:
      'The deck uses Italian suits: Swords, Batons, Cups, and Coins. The long suits lose their four lowest cards and the round suits lose their four highest pip cards.',
    rankDescription:
      'Long suits keep King, Queen, Cavalier, Jack, 10, 9, 8, 7, 6, 5. Round suits keep King, Queen, Cavalier, Jack, Ace, 2, 3, 4, 5, 6. Trumps remain 1 to 21 plus the Fool.',
  },
  'Tarot 62\0Tarocco_Piemontese\0Tarot_62': {
    deckDescription:
      'A 62-card reduced Tarocco Piemontese deck with 21 trumps plus the Fool and 40 Italian-suited cards, formed by removing Ace through 4 from Swords and Batons and 7 through 10 from Cups and Coins.',
    suitDescription:
      'The suits are Swords, Batons, Cups, and Coins. Long suits keep their higher pip sequence while round suits keep Ace through 6 beneath the courts.',
    rankDescription:
      'Long suits rank King, Queen, Cavalier, Jack, 10, 9, 8, 7, 6, 5. Round suits rank King, Queen, Cavalier, Jack, Ace, 2, 3, 4, 5, 6. Trumps remain 1 to 21 plus the Fool.',
  },
};

function descriptionKey(triple: Triple): string {
  return `${triple.deckType}\0${triple.suitSet}\0${triple.rankSet}`;
}

function updatesFor(slugs: string[], triple: Triple): GameUpdate[] {
  const descriptions = DESCRIPTION_BY_KEY[descriptionKey(triple)];
  if (!descriptions) {
    throw new Error(`Missing description set for ${descriptionKey(triple)}`);
  }
  return slugs.map((slug) => ({ slug, triple, descriptions }));
}

const updates: GameUpdate[] = [
  ...updatesFor(['tarot', 'tarot-chambery', 'mort-la-morte'], {
    deckType: 'Tarot 78',
    suitSet: 'French_tarock',
    rankSet: 'Tarot_78',
  }),
  ...updatesFor(['mitigatti'], {
    deckType: 'Tarot 78',
    suitSet: 'Tarocco_Piemontese',
    rankSet: 'Tarot_78',
  }),
  ...updatesFor(['tarock-t-bingen', 'tarok-danish'], {
    deckType: 'Tarot 78',
    suitSet: 'French_tarock',
    rankSet: 'Tarot_78',
  }),
  ...updatesFor(['troccas'], {
    deckType: 'Tarot 78',
    suitSet: 'Swiss_1JJ',
    rankSet: 'Tarot_78',
  }),
  ...updatesFor(['tarot-marolles'], {
    deckType: 'Tarot 66',
    suitSet: 'Tarot_de_Marseille',
    rankSet: 'Tarot_66',
  }),
  ...updatesFor(['droggn', 'droggn-tarock'], {
    deckType: 'Tarot 66',
    suitSet: 'French_tarock',
    rankSet: 'Tarot_66',
  }),
  ...updatesFor(['cego', 'dappen-black-forest-tapp-tarock', 'dreierles'], {
    deckType: 'Tarot 54',
    suitSet: 'Cego',
    rankSet: 'Tarot_54',
  }),
  ...updatesFor([
    'k-nigrufen-graden',
    'k-nigrufen-lungau-tarock',
    'k-nigrufen-ru-bach',
    'k-nigrufen-tarock',
    'tapp-tarock',
    'tarock-k-nigrufen-austrian',
    'tarock-lungau-k-nigrufen',
    'taroki-polish-call-king',
    'taroki-polish-call-xix',
    'tarok-romanian',
    'tarok-slovenian',
    'taroky-czech',
    'taroky-nebraska',
    'xxas-hivasos-tarokk',
  ], {
    deckType: 'Tarot 54',
    suitSet: 'Industrie_und_Glueck',
    rankSet: 'Tarot_54',
  }),
  ...updatesFor([
    'hungarian-tarokk',
    'huszashivasos-tarokk',
    'illustrated-tarokk-hungarian',
    'palatinusz-tarokk-hungarian',
    'paskievics-tarokk',
    'tarokk-hungarian',
  ], {
    deckType: 'Tarot 42',
    suitSet: 'Industrie_und_Glueck',
    rankSet: 'Tarot_42',
  }),
  ...updatesFor(['zwanzigerrufen'], {
    deckType: 'Tarot 40',
    suitSet: 'Industrie_und_Glueck',
    rankSet: 'Tarot_40',
  }),
  ...updatesFor(['troggu'], {
    deckType: 'Tarot 62',
    suitSet: 'Swiss_1JJ',
    rankSet: 'Tarot_62',
  }),
  ...updatesFor(['piedicavallo-tarocchi'], {
    deckType: 'Tarot 62',
    suitSet: 'Tarocco_Piemontese',
    rankSet: 'Tarot_62',
  }),
];

function updateGameFile(update: GameUpdate): void {
  const filePath = path.join(PROCESSED_GAMES_DIR, `${update.slug}.json`);
  const game = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  const engine = (game.engine as Record<string, unknown>) ?? {};

  engine.deckType = update.triple.deckType;
  engine.suitSet = update.triple.suitSet;
  engine.rankSet = update.triple.rankSet;
  engine.deckDescription = update.descriptions.deckDescription;
  engine.suitDescription = update.descriptions.suitDescription;
  engine.rankDescription = update.descriptions.rankDescription;
  game.engine = engine;

  if (update.overviewDeck && game.overview && typeof game.overview === 'object') {
    (game.overview as Record<string, unknown>).deck = update.overviewDeck;
  }
  if (update.setupDeck && game.setup && typeof game.setup === 'object') {
    (game.setup as Record<string, unknown>).deck = update.setupDeck;
  }

  fs.writeFileSync(filePath, JSON.stringify(game, null, 2) + '\n', 'utf8');
}

function main(): void {
  for (const update of updates) {
    updateGameFile(update);
  }

  const mitigattiPath = path.join(PROCESSED_GAMES_DIR, 'mitigatti.json');
  const mitigatti = JSON.parse(fs.readFileSync(mitigattiPath, 'utf8')) as Record<string, unknown>;
  if (mitigatti.overview && typeof mitigatti.overview === 'object') {
    (mitigatti.overview as Record<string, unknown>).deck =
      '78-card tarot deck; historically Italian-suited Tarocco Piemontese, but by the Nice 1930 source often played with French-suited tarot cards';
  }
  if (mitigatti.setup && typeof mitigatti.setup === 'object') {
    (mitigatti.setup as Record<string, unknown>).deck =
      '78-card Italian-suited tarot pack. The Nice source describes the older Piedmontese / Marseille-style structure while noting that local players had largely switched to French-suited tarot cards by the early twentieth century.';
  }
  fs.writeFileSync(mitigattiPath, JSON.stringify(mitigatti, null, 2) + '\n', 'utf8');
}

main();
