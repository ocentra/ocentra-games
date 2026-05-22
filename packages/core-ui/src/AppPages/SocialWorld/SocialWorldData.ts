import type { SocialWorldBooth, SocialWorldDistrict, SocialWorldDistrictTone } from './SocialWorldTypes';

const jadeTone: SocialWorldDistrictTone = {
  primary: '#4ade80',
  secondary: '#0f8f68',
  accent: '#f7c948',
  ground: '#173f34',
};

const amberTone: SocialWorldDistrictTone = {
  primary: '#f5b642',
  secondary: '#b65f1e',
  accent: '#72e7ff',
  ground: '#46351d',
};

const roseTone: SocialWorldDistrictTone = {
  primary: '#fb7185',
  secondary: '#a73562',
  accent: '#ffd166',
  ground: '#4a2234',
};

const tealTone: SocialWorldDistrictTone = {
  primary: '#2dd4bf',
  secondary: '#117f7a',
  accent: '#f8e16c',
  ground: '#143f45',
};

const violetTone: SocialWorldDistrictTone = {
  primary: '#a78bfa',
  secondary: '#5c4fc3',
  accent: '#7dd3fc',
  ground: '#302a55',
};

const clayTone: SocialWorldDistrictTone = {
  primary: '#f97316',
  secondary: '#9a4f24',
  accent: '#86efac',
  ground: '#4a2d1d',
};

const skyTone: SocialWorldDistrictTone = {
  primary: '#7dd3fc',
  secondary: '#1f7ea5',
  accent: '#facc15',
  ground: '#183d55',
};

const limeTone: SocialWorldDistrictTone = {
  primary: '#bef264',
  secondary: '#608b28',
  accent: '#f9a8d4',
  ground: '#33451f',
};

export const SOCIAL_WORLD_DISTRICTS: SocialWorldDistrict[] = [
  {
    id: 'plaza',
    name: 'Ocentra Plaza',
    shortName: 'Plaza',
    summary: 'The central open square for parties, rewards, tournaments, and fast travel.',
    boothCount: 'Core hubs',
    position: { x: 0, z: 0 },
    radius: 10,
    tone: jadeTone,
  },
  {
    id: 'trick-taking',
    name: 'Trick-Taking Isles',
    shortName: 'Tricks',
    summary: 'Bid, follow suit, count points, and move into regional trick tables.',
    boothCount: '180+ booths',
    position: { x: -28, z: -20 },
    radius: 8,
    tone: amberTone,
  },
  {
    id: 'poker',
    name: 'Poker Quarter',
    shortName: 'Poker',
    summary: 'Draw, stud, shared-card, showdown, and table-stakes villages.',
    boothCount: '120+ booths',
    position: { x: 26, z: -22 },
    radius: 8,
    tone: roseTone,
  },
  {
    id: 'rummy',
    name: 'Rummy Gardens',
    shortName: 'Rummy',
    summary: 'Meld sets, runs, discards, and hand-building games grouped into calm garden lanes.',
    boothCount: '110+ booths',
    position: { x: -34, z: 14 },
    radius: 8,
    tone: tealTone,
  },
  {
    id: 'domino',
    name: 'Domino Docks',
    shortName: 'Domino',
    summary: 'Block, draw, line, adding, partnership, and tile-table games.',
    boothCount: '95+ booths',
    position: { x: 32, z: 15 },
    radius: 8,
    tone: violetTone,
  },
  {
    id: 'patience',
    name: 'Patience Heights',
    shortName: 'Solo',
    summary: 'Solitaire, patience, layout puzzles, and personal challenge rooms.',
    boothCount: '90+ booths',
    position: { x: -6, z: 36 },
    radius: 8,
    tone: skyTone,
  },
  {
    id: 'shedding',
    name: 'Shedding Alley',
    shortName: 'Shedding',
    summary: 'Race-to-empty games, climbing ladders, last-card pressure, and fast casual tables.',
    boothCount: '85+ booths',
    position: { x: 4, z: -39 },
    radius: 8,
    tone: clayTone,
  },
  {
    id: 'regional',
    name: 'Regional Classics',
    shortName: 'Regional',
    summary: 'Country and village collections that keep families of games close together.',
    boothCount: '300+ booths',
    position: { x: 39, z: -3 },
    radius: 8,
    tone: limeTone,
  },
];

export const SOCIAL_WORLD_CATEGORY_LANDS: Array<{
  id: string;
  name: string;
  districtId: string;
  categoryId: string;
  boothCount: string;
  position: { x: number; z: number };
}> = [
  { id: 'land-trick-taking', name: 'Trick-Taking Village', districtId: 'trick-taking', categoryId: 'trick-taking', boothCount: '180+ games', position: { x: -31, z: -26 } },
  { id: 'land-point-trick', name: 'Point-Trick Court', districtId: 'trick-taking', categoryId: 'point-trick', boothCount: '70+ games', position: { x: -21, z: -16 } },
  { id: 'land-tarock', name: 'Tarock Tower', districtId: 'trick-taking', categoryId: 'tarock', boothCount: '35+ games', position: { x: -38, z: -13 } },
  { id: 'land-draw-poker', name: 'Draw Poker Row', districtId: 'poker', categoryId: 'draw-poker', boothCount: '35+ games', position: { x: 20, z: -28 } },
  { id: 'land-stud-poker', name: 'Stud Steps', districtId: 'poker', categoryId: 'stud-poker', boothCount: '40+ games', position: { x: 32, z: -18 } },
  { id: 'land-shared-card', name: 'Shared Card Square', districtId: 'poker', categoryId: 'shared-card-poker', boothCount: '30+ games', position: { x: 38, z: -28 } },
  { id: 'land-rummy', name: 'Rummy Runs', districtId: 'rummy', categoryId: 'rummy', boothCount: '110+ games', position: { x: -38, z: 20 } },
  { id: 'land-matching', name: 'Matching Grove', districtId: 'rummy', categoryId: 'matching', boothCount: '45+ games', position: { x: -28, z: 9 } },
  { id: 'land-fishing', name: 'Fishing Cove', districtId: 'rummy', categoryId: 'fishing', boothCount: '35+ games', position: { x: -43, z: 9 } },
  { id: 'land-block-domino', name: 'Block Domino Pier', districtId: 'domino', categoryId: 'block-domino', boothCount: '45+ games', position: { x: 27, z: 21 } },
  { id: 'land-line-domino', name: 'Line Game Marina', districtId: 'domino', categoryId: 'line-domino', boothCount: '30+ games', position: { x: 38, z: 11 } },
  { id: 'land-adding-domino', name: 'Adding Dock', districtId: 'domino', categoryId: 'adding-domino', boothCount: '20+ games', position: { x: 40, z: 24 } },
  { id: 'land-solitaire', name: 'Solitaire Terrace', districtId: 'patience', categoryId: 'solitaire', boothCount: '90+ games', position: { x: -12, z: 40 } },
  { id: 'land-layout', name: 'Layout Puzzle Yard', districtId: 'patience', categoryId: 'layout-puzzle', boothCount: '45+ games', position: { x: 3, z: 42 } },
  { id: 'land-shedding', name: 'Last Card Lane', districtId: 'shedding', categoryId: 'shedding', boothCount: '85+ games', position: { x: -3, z: -44 } },
  { id: 'land-climbing', name: 'Climbing Ridge', districtId: 'shedding', categoryId: 'climbing', boothCount: '55+ games', position: { x: 11, z: -44 } },
  { id: 'land-family', name: 'Family Commons', districtId: 'regional', categoryId: 'family', boothCount: '75+ games', position: { x: 43, z: -9 } },
  { id: 'land-casino', name: 'Casino Arcade', districtId: 'regional', categoryId: 'casino', boothCount: '45+ games', position: { x: 48, z: 3 } },
  { id: 'land-war', name: 'Battle Deck Yard', districtId: 'regional', categoryId: 'war', boothCount: '25+ games', position: { x: 35, z: 5 } },
  { id: 'land-experimental', name: 'Experimental Foundry', districtId: 'regional', categoryId: 'experimental', boothCount: 'New builds', position: { x: 43, z: 12 } },
];

const districtTone = (districtId: string): SocialWorldDistrictTone =>
  SOCIAL_WORLD_DISTRICTS.find((district) => district.id === districtId)?.tone ?? jadeTone;

export const SOCIAL_WORLD_BOOTHS: SocialWorldBooth[] = [
  {
    id: 'claim-room',
    districtId: 'plaza',
    title: 'Claim Room',
    subtitle: 'Featured table lobby',
    summary: 'Jump from the plaza into the Claim lobby without searching the full catalog.',
    kind: 'game',
    actionLabel: 'Enter Lobby',
    gameId: 'claim:ddc6d965-14a7-4586-8a15-674e0daf8b5c',
    position: { x: -7, z: -5 },
    size: 1.35,
    tone: amberTone,
  },
  {
    id: 'bistrolla-room',
    districtId: 'plaza',
    title: 'Bistrolla Room',
    subtitle: 'Pilot booth',
    summary: 'A reserved booth shape for games that are being staged before their full village is ready.',
    kind: 'game',
    actionLabel: 'Open Booth',
    gameId: 'bistrolla',
    position: { x: 7, z: -5 },
    size: 1.25,
    tone: tealTone,
  },
  {
    id: 'reward-shop',
    districtId: 'plaza',
    title: 'Reward Shop',
    subtitle: 'Daily spin and cosmetics',
    summary: 'Spend credits, claim daily rewards, and preview account cosmetics from the world.',
    kind: 'reward',
    actionLabel: 'Open Shop',
    position: { x: -8, z: 5 },
    size: 1.2,
    tone: limeTone,
  },
  {
    id: 'party-board',
    districtId: 'plaza',
    title: 'Party Board',
    subtitle: 'Friends and invites',
    summary: 'Create a party, invite friends, and carry the group into category lands or game lobbies.',
    kind: 'party',
    actionLabel: 'Create Party',
    position: { x: 0, z: 7 },
    size: 1.2,
    tone: roseTone,
  },
  {
    id: 'tournament-desk',
    districtId: 'plaza',
    title: 'Tournament Desk',
    subtitle: 'Events and ladders',
    summary: 'Move into bracket, leaderboard, and seasonal competition surfaces.',
    kind: 'competition',
    actionLabel: 'View Events',
    position: { x: 8, z: 5 },
    size: 1.2,
    tone: violetTone,
  },
  {
    id: 'profile-studio',
    districtId: 'plaza',
    title: 'Profile Studio',
    subtitle: 'Player hub',
    summary: 'Open profile, inventory, badges, and marketplace context from inside the plaza.',
    kind: 'profile',
    actionLabel: 'Player Hub',
    position: { x: 0, z: -9 },
    size: 1.05,
    tone: skyTone,
  },
  ...SOCIAL_WORLD_CATEGORY_LANDS.map<SocialWorldBooth>((land) => ({
    id: land.id,
    districtId: land.districtId,
    title: land.name,
    subtitle: SOCIAL_WORLD_DISTRICTS.find((district) => district.id === land.districtId)?.name ?? 'Category land',
    summary: 'A categorized village that can hold many generated game booths without creating one giant map.',
    kind: 'category',
    actionLabel: 'Visit Land',
    boothCount: land.boothCount,
    categoryId: land.categoryId,
    position: land.position,
    size: 0.95,
    tone: districtTone(land.districtId),
  })),
];
