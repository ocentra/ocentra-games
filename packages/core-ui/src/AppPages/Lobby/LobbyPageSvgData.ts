import { avatarImageById } from '@ocentra/app-assets/avatars';
import { lobbyPlaceholderImageByKey } from '@ocentra/app-assets/lobby-placeholders';
import type { FeaturedCardData, LobbyRoomLike, LobbyTableRow } from './LobbyPageSvgTypes';

export const LOBBY_CONFIG = {
  game: {
    title: 'CLAIM',
    subtitle: 'FOUR-PLAYER TRICK-TAKING CARD GAME',
  },
  user: {
    name: 'Sujan',
    displayName: 'Sujan (You)',
    level: 'Level 27',
    xp: '1,850 / 3,000 XP',
    balance: '12,450 OCN',
  },
  headerStats: {
    playersOnline: '2,418',
    activeMatches: '42',
    openTables: '186',
  },
  server: {
    active: 'NA East',
    ping: '42ms',
    options: [
      ['NA East', '42ms', true],
      ['NA West', '68ms', false],
      ['EU West', '91ms', false],
    ] as const,
  },
};

export const SIDEBAR_ACTIONS = [
  { key: 'quickJoin', label: 'QUICK JOIN', sub: 'Join the best available table', icon: 'bolt', active: true },
  { key: 'createTable', label: 'CREATE TABLE', sub: 'Create a custom table', icon: 'createTable', active: false },
  { key: 'joinCode', label: 'JOIN WITH CODE', sub: 'Enter private code', icon: 'lock', active: false },
  { key: 'playAi', label: 'PLAY VS AI', sub: 'Practice or train', icon: 'bot', active: false },
] as const;

export const SIDEBAR_NAV_ITEMS = [
  ['LOBBY', 'people', '#7d49ff', true],
  ['TOURNAMENTS', 'trophy', '#f6a83b', false],
  ['LEADERBOARD', 'bars', '#f6a83b', false],
  ['REWARDS', 'gift', '#f6a83b', false],
  ['STORE', 'cart', '#7d49ff', false],
  ['PROFILE', 'user', '#7d49ff', false],
  ['SETTINGS', 'gear', '#91a6c6', false],
] as const;

export const MODE_TABS = [
  ['ALL MODES', '', 112],
  ['REAL PLAYERS', 'No AI', 138],
  ['AI VS AI BENCHMARK', 'Watch AI Compete', 184],
  ['TRAINING (AI GUIDE)', 'Learn & Improve', 182],
  ['NO AI ALLOWED', 'Skill Pure', 140],
  ['STAKES / ENTRY', 'Play for Prizes', 140],
] as const;

export const ACTIVE_FILTERS = [
  ['master', 'Master', '1 Table', '#ffca4b', false, false, false, lobbyPlaceholderImageByKey.master],
  ['ai-showdown', 'AI Showdown', '2 Tables', '#7d49ff', true, true, false, lobbyPlaceholderImageByKey.aiShowdown],
  ['ai-vs-human', 'AI Vs Human', '1 Table', '#13d8f0', true, false, false, lobbyPlaceholderImageByKey.aiVsHuman],
  ['ai-coach', 'AI Coach', '3 Tables', '#19e4ff', true, false, false, lobbyPlaceholderImageByKey.aiCoach],
  ['high-stake', 'High Stake', '1 Table', '#ff4b58', false, false, false, lobbyPlaceholderImageByKey.highStake],
  ['ranked', 'Ranked', '4 Tables', '#37a8ff', false, false, false, lobbyPlaceholderImageByKey.ranked],
  ['casual', 'Casual', '5 Tables', '#33ffa3', false, false, false, lobbyPlaceholderImageByKey.casual],
] as const;

export const REWARD_SPINNER = {
  labels: ['25', '50', '100', '0', '75', '125', '250', '25', '500', '150', '200', '50'],
  colors: ['#241b68', '#0a2b4d', '#6d35ff', '#071426', '#13d8f0', '#2b1b7a', '#ffca4b', '#06111f', '#7d49ff', '#075365', '#a65d13', '#091735'],
  textColors: ['#ffffff', '#9ff6ff', '#ffffff', '#8d9bad', '#03111b', '#ffffff', '#160b2c', '#ffffff', '#fff2a6', '#ffffff', '#fff2a6', '#9ff6ff'],
  title: 'DAILY REWARD',
  readyLabel: 'SPIN READY',
  edgeText: 'SPIN TO COLLECT YOUR DAILY REWARD',
};

export const FRIENDS = [
  ['Mira', 'In Lobby', avatarImageById[2]],
  ['Rohan', 'In Game', avatarImageById[3]],
  ['Alex', 'Online', avatarImageById[4]],
  ['Priya', 'Online', avatarImageById[5]],
  ['Dev', 'In Game', avatarImageById[6]],
] as const;

export const LOBBY_CHAT_MESSAGES = [
  ['Mira', 'Anyone up for a quick game?', '2m ago', avatarImageById[2]],
  [LOBBY_CONFIG.user.name, 'Created a room. Join me', '1m ago', avatarImageById[1]],
  ['Alex', 'On my way!', 'Now', avatarImageById[4]],
] as const;

export const DEFAULT_TABLE_ROWS: LobbyTableRow[] = [
  { code: 'A72', title: 'Claim Masters', tags: ['RANKED', 'REAL PLAYERS', 'PUBLIC'], players: '3 / 4', spectators: '4', entry: '100 OCN', action: 'JOIN TABLE', tone: 'cyan', ai: false, live: false, full: false, names: ['Sujan', 'Mira', 'Rohan', 'Open Seat'], avatarUrls: [avatarImageById[1], avatarImageById[2], avatarImageById[3], null] },
  { code: 'B19', title: 'Quick Claim', tags: ['CASUAL', 'REAL PLAYERS', 'PUBLIC'], players: '2 / 4', spectators: '1', entry: null, action: 'JOIN TABLE', tone: 'purple', ai: false, live: false, full: false, names: ['Alex', 'Priya', 'Open Seat', 'Open Seat'], avatarUrls: [avatarImageById[4], avatarImageById[5], null, null] },
  { code: 'B55', title: 'AI Grand Showdown', tags: ['AI VS AI', 'BENCHMARK'], players: '12', spectators: '24', entry: null, action: 'WATCH LIVE', tone: 'purple', ai: true, live: true, full: false, names: ['ChatGPT-4o', 'Claude 3.5', 'Gemini Pro', 'Llama 3'], avatarUrls: [avatarImageById[7], avatarImageById[8], avatarImageById[9], avatarImageById[10]] },
  { code: 'C18', title: 'Learn with AI Coach', tags: ['TRAINING', 'AI GUIDE', 'PUBLIC'], players: '1 / 4', spectators: '0', entry: null, action: 'JOIN TABLE', tone: 'cyan', ai: true, live: false, full: false, names: ['You', 'AI Coach', 'AI Beginner', 'Open Seat'], avatarUrls: [avatarImageById[1], avatarImageById[11], avatarImageById[12], null] },
  { code: 'D31', title: 'High Stakes Table', tags: ['NO AI ALLOWED', 'PRIVATE'], players: '4 / 4', spectators: '9', entry: '500 OCN', action: 'FULL', tone: 'red', ai: false, live: false, full: true, names: ['Zara', 'Dev', 'Kabir', 'Neha'], avatarUrls: [avatarImageById[13], avatarImageById[6], avatarImageById[14], avatarImageById[15]] },
  { code: 'E09', title: 'AI Speed Run Arena', tags: ['AI VS AI', 'SHOWCASE'], players: '28', spectators: '80', entry: null, action: 'WATCH LIVE', tone: 'purple', ai: true, live: true, full: false, names: ['Grok 2', 'Gemini Pro', 'DeepSeek R1', 'Mistral Large'], avatarUrls: [avatarImageById[16], avatarImageById[9], avatarImageById[17], avatarImageById[18]] },
  { code: 'F42', title: 'Casual Claim Night', tags: ['CASUAL', 'PUBLIC'], players: '1 / 4', spectators: '0', entry: null, action: 'JOIN TABLE', tone: 'cyan', ai: false, live: false, full: false, names: ['Nina', 'Open Seat', 'Open Seat', 'Open Seat'], avatarUrls: [avatarImageById[10], null, null, null] },
  { code: 'G07', title: 'Training Table', tags: ['TRAINING', 'AI GUIDE'], players: '2 / 4', spectators: '2', entry: null, action: 'JOIN TABLE', tone: 'cyan', ai: true, live: false, full: false, names: ['You', 'AI Coach', 'Open Seat', 'Open Seat'], avatarUrls: [avatarImageById[1], avatarImageById[11], null, null] },
];

export const DEFAULT_FEATURED_CARDS: FeaturedCardData[] = [
  { cardType: 'starter', presetKey: 'master', code: 'MASTER', tag: 'MASTER', title: 'Master', subtitle: 'Tournament-grade table setup', description: 'Create a competitive four-seat room with ranked-style pressure, standard timing, and serious table defaults.', players: '4', countLabel: 'Seats', cta: 'CREATE', tone: 'gold', badges: ['STARTER', 'REAL'], variant: 'green', imageUrl: lobbyPlaceholderImageByKey.master },
  { cardType: 'starter', presetKey: 'ai-showdown', code: 'AI-S', tag: 'AI VS AI', title: 'AI Showdown', subtitle: 'Automated benchmark table', description: 'Spin up an AI-only room for model-vs-model runs, spectating, benchmark capture, or balance checks.', players: '4', countLabel: 'AI Seats', cta: 'CREATE', tone: 'purple', ai: true, badges: ['STARTER', 'BENCH'], variant: 'purple', imageUrl: lobbyPlaceholderImageByKey.aiShowdown },
  { cardType: 'starter', presetKey: 'ai-vs-human', code: 'AIVH', tag: 'MIXED', title: 'AI Vs Human', subtitle: 'Humans and AI at one table', description: 'Create a mixed room where open seats can be filled by players or AI opponents depending on lobby rules.', players: '4', countLabel: 'Seats', cta: 'CREATE', tone: 'cyan', ai: true, badges: ['STARTER', 'MIXED'], variant: 'purple', imageUrl: lobbyPlaceholderImageByKey.aiVsHuman },
  { cardType: 'starter', presetKey: 'ai-coach', code: 'COACH', tag: 'TRAINING', title: 'AI Coach', subtitle: 'Guided practice table', description: 'Start a training table with coach prompts, move review, and low-pressure practice defaults.', players: '1-4', countLabel: 'Seats', cta: 'START', tone: 'cyan', ai: true, badges: ['STARTER', 'GUIDE'], variant: 'brown', imageUrl: lobbyPlaceholderImageByKey.aiCoach },
  { cardType: 'starter', presetKey: 'high-stake', code: 'STAKE', tag: 'STAKES', title: 'High Stake', subtitle: 'Prize-entry room setup', description: 'Create an entry-gated room for prize play. The actual entry amount comes from the game lobby economy rules.', players: '4', countLabel: 'Seats', cta: 'CREATE', tone: 'red', badges: ['STARTER', 'ENTRY'], variant: 'brown', imageUrl: lobbyPlaceholderImageByKey.highStake },
  { cardType: 'starter', presetKey: 'ranked', code: 'RANK', tag: 'RANKED', title: 'Ranked', subtitle: 'Rating-focused matchmaking', description: 'Create a ranked-style room with real-player defaults, fair-play checks, and leaderboard-oriented settings.', players: '4', countLabel: 'Seats', cta: 'CREATE', tone: 'gold', badges: ['STARTER', 'RATED'], variant: 'green', imageUrl: lobbyPlaceholderImageByKey.ranked },
  { cardType: 'starter', presetKey: 'casual', code: 'CASUAL', tag: 'CASUAL', title: 'Casual', subtitle: 'Fast public table setup', description: 'Create a low-friction public room for quick games, friends, or new players learning the table flow.', players: '4', countLabel: 'Seats', cta: 'CREATE', tone: 'cyan', badges: ['STARTER', 'PUBLIC'], variant: 'green', imageUrl: lobbyPlaceholderImageByKey.casual },
];


export function roomToTableRow(room: LobbyRoomLike, index: number): LobbyTableRow {
  const currentPlayers = room.currentPlayers ?? 0;
  const maxPlayers = room.maxPlayers ?? 4;
  const full = currentPlayers >= maxPlayers;
  const status = room.gameStatus ?? room.status ?? 'waiting';
  const code = room.roomId ? room.roomId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() : `R${String(index + 1).padStart(2, '0')}`;
  const type = room.visibility || room.roomType || (room.isPrivate ? 'private' : 'public');
  const mode = room.mode || 'casual';
  const stakeAmount = room.stakeAmount ?? 0;
  const stakeType = room.stakeType ?? 'free';
  const entry = stakeType === 'free' || stakeAmount === 0 ? null : `${stakeAmount} ${stakeType === 'game-coin' ? 'OCN' : 'USD'}`;
  const sortedPlayers = [...(room.players ?? [])].sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
  const names = Array.from({ length: maxPlayers }, (_, seatIndex) => {
    const player = sortedPlayers.find(item => (item.seatIndex ?? 0) === seatIndex) ?? sortedPlayers[seatIndex];
    if (!player) return 'Open Seat';
    if (player.isAI) return player.displayName || `AI Seat ${seatIndex + 1}`;
    return player.displayName || player.userId || 'Occupied';
  });
  const normalizedStatus = status === 'waiting' ? 'OPEN' : status.toUpperCase();
  return {
    code,
    title: room.roomName || `${room.gameType || 'Claim'} ${mode} table`,
    tags: [mode.toUpperCase(), type.toUpperCase(), normalizedStatus],
    players: `${currentPlayers} / ${maxPlayers}`,
    spectators: String(room.currentSpectators ?? 0),
    entry,
    action: room.viewerJoined ? 'LEAVE TABLE' : full ? 'FULL' : 'JOIN TABLE',
    tone: full ? 'red' : type === 'private' ? 'purple' : entry ? 'gold' : 'cyan',
    ai: Boolean(room.allowAI || (room.aiCount ?? 0) > 0 || sortedPlayers.some(player => player.isAI)),
    live: status === 'active' || status === 'starting' || status === 'in-progress',
    full,
    viewerJoined: room.viewerJoined,
    viewerSpectating: room.viewerSpectating,
    names,
    roomId: room.roomId,
  };
}
