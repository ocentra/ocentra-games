import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { avatarImageById } from '@ocentra/app-assets/avatars';
import {
  DailySpinBadgeSvg,
  DailySpinSpinnerSvg,
} from '../../Common/Rewards/DailySpinSvg';
import {
  ACTIVE_FILTERS,
  DEFAULT_FEATURED_CARDS,
  DEFAULT_TABLE_ROWS,
  FRIENDS,
  LOBBY_CHAT_MESSAGES,
  LOBBY_CONFIG,
  MODE_TABS,
  roomToTableRow,
} from './LobbyPageSvgData';
import { roundedRectPath } from './LobbyPageSvgGeometry';
import {
  Avatar,
  Btn,
  CenterTxt,
  Defs,
  Panel,
  Txt,
} from './LobbyPageSvgPrimitives';
import {
  ActiveNow,
  Featured,
  FooterStatus,
  Header,
  ModeTabs,
  RightRail,
  Sidebar,
} from './LobbyPageSvgPrefabs';
import {
  H,
  W,
  type FeaturedCardData,
  type LobbyAddAISeatDraft,
  type LobbyActiveFilterItem,
  type LobbyChatMessageItem,
  type LobbyCreateRoomDraft,
  type LobbyFriendItem,
  type LobbyHeaderStats,
  type LobbyHeroMedia,
  type LobbyJoinCodeDraft,
  type LobbyNavigationTarget,
  type LobbyPartyStatus,
  type LobbyPanelRect,
  type LobbyQuickJoinDraft,
  type LobbyRewardStatus,
  type LobbyRoomLike,
  type LobbyRoomListFilterDraft,
  type LobbyRoomPlayer,
  type LobbyServerStatus,
  type LobbyTableRow,
  type LobbyUserSummary,
} from './LobbyPageSvgTypes';
import {
  ActionPopup,
  FeaturedCardPopup,
  FilterPopup,
  PlayersPopup,
  StatusOverlay,
} from './LobbyPageSvgPopups';
import {
  normalizeLobbyPageSvgControls,
  type LobbyPageSvgControls,
} from './LobbyPageSvgSurfaceControls';

export type LobbyPageSvgSurfaceProps = {
  loading: boolean;
  creating: boolean;
  error: string | null;
  gameId: string;
  gameName?: string;
  rooms: LobbyRoomLike[];
  busyRoomId: string | null;
  onRefresh: () => void;
  onCreateRoom: (draft?: LobbyCreateRoomDraft) => void;
  onQuickJoin: (draft?: LobbyQuickJoinDraft) => void;
  onJoinRoom: (roomId: string) => void;
  onJoinRoomCode: (draft: LobbyJoinCodeDraft) => void;
  onSpectateRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onReadyRoom?: (roomId: string) => void;
  onUnreadyRoom?: (roomId: string) => void;
  onStartRoom?: (roomId: string) => void;
  onAddAIRoom?: (roomId: string, draft?: LobbyAddAISeatDraft) => void;
  onSendRoomChat?: (message: string) => void;
  onSendLobbyChat?: (message: string) => void;
  onAddFriend?: (friendId: string) => void;
  onInviteFriend?: (friendId: string) => void;
  onCreateParty?: () => void;
  onLeaveParty?: () => void;
  onClaimReward?: () => void;
  onSelectServer?: (regionId: string) => void;
  onRefreshLobbyServices?: () => void;
  onShareRoomCode?: (room: LobbyRoomLike) => void;
  onMatchmaking: () => void;
  filters?: LobbyRoomListFilterDraft;
  onFilterRooms?: (filters: LobbyRoomListFilterDraft) => void;
  onNavigate?: (target: LobbyNavigationTarget) => void;
  onWallet?: () => void;
  controls?: Partial<LobbyPageSvgControls> | null;
  useSampleData?: boolean;
  viewer?: LobbyUserSummary | null;
  viewerUserId?: string;
  joinedRoom?: LobbyRoomLike | null;
  friends?: LobbyFriendItem[];
  chatMessages?: LobbyChatMessageItem[];
  lobbyChatMessages?: LobbyChatMessageItem[];
  reward?: LobbyRewardStatus | null;
  party?: LobbyPartyStatus | null;
  server?: LobbyServerStatus | null;
  minPlayers?: number;
  maxPlayers?: number;
  gameTagline?: string;
  heroMedia?: LobbyHeroMedia;
};

const sampleViewer: LobbyUserSummary = {
  name: LOBBY_CONFIG.user.name,
  level: LOBBY_CONFIG.user.level,
  xp: LOBBY_CONFIG.user.xp,
  balance: LOBBY_CONFIG.user.balance,
  xpRatio: 0.52,
  avatarUrl: avatarImageById[1],
};

function countRows(rows: LobbyTableRow[], predicate: (row: LobbyTableRow) => boolean): number {
  return rows.reduce((sum, row) => sum + (predicate(row) ? 1 : 0), 0);
}

function formatTableCount(count: number): string {
  return `${count} ${count === 1 ? 'Table' : 'Tables'}`;
}

function presetKeyForRow(row: LobbyTableRow): string {
  const text = `${row.title} ${row.tags.join(' ')} ${row.entry ?? ''}`.toLowerCase();
  if (text.includes('master')) return 'master';
  if (text.includes('ai vs ai') || text.includes('showdown') || text.includes('benchmark')) return 'ai-showdown';
  if (text.includes('ai vs human') || text.includes('mixed')) return 'ai-vs-human';
  if (text.includes('coach') || text.includes('training') || text.includes('guide') || text.includes('practice')) return 'ai-coach';
  if (text.includes('stake') || Boolean(row.entry)) return 'high-stake';
  if (text.includes('ranked') || text.includes('rank')) return 'ranked';
  return 'casual';
}

function starterCardForPreset(presetKey: string): FeaturedCardData | undefined {
  return DEFAULT_FEATURED_CARDS.find(card => card.presetKey === presetKey);
}

function modeForPreset(presetKey: string | undefined): LobbyCreateRoomDraft['mode'] {
  if (presetKey === 'ranked' || presetKey === 'master') return 'ranked';
  if (presetKey === 'ai-showdown') return 'benchmark';
  if (presetKey === 'ai-coach') return 'training';
  if (presetKey === 'high-stake') return 'stakes';
  return 'casual';
}

function starterDraftForCard(card: FeaturedCardData): LobbyCreateRoomDraft {
  const playerCount = Number(card.players);
  const maxPlayers = Number.isFinite(playerCount) && playerCount > 0 ? playerCount : 4;
  const stakeType = card.entry ? 'game-coin' : 'free';
  return {
    presetKey: card.presetKey,
    roomName: `${card.title} Table`,
    mode: modeForPreset(card.presetKey),
    visibility: 'public',
    maxPlayers,
    allowAI: Boolean(card.ai),
    aiCount: card.ai ? Math.max(1, maxPlayers - 1) : 0,
    allowSpectators: true,
    stakeType,
    stakeAmount: stakeType === 'game-coin' ? 100 : 0,
    turnTimerSeconds: 60,
    region: 'global',
  };
}

function buildRuntimeActiveFilters(rows: LobbyTableRow[]): LobbyActiveFilterItem[] {
  const colorByTone = {
    cyan: '#13d8f0',
    purple: '#7d49ff',
    gold: '#ffca4b',
    red: '#ff4b58',
  } as const;
  return DEFAULT_FEATURED_CARDS.map(card => ({
    presetKey: card.presetKey,
    label: card.title,
    count: formatTableCount(countRows(rows, row => presetKeyForRow(row) === card.presetKey)),
    color: colorByTone[card.tone],
    ai: Boolean(card.ai),
    live: rows.some(row => row.live && presetKeyForRow(row) === card.presetKey),
    create: false,
    imageUrl: card.imageUrl,
  }));
}

function buildHeaderStats({
  rows,
  rooms,
  viewer,
  useSampleData,
}: {
  rows: LobbyTableRow[];
  rooms: LobbyRoomLike[];
  viewer: LobbyUserSummary | null;
  useSampleData: boolean;
}): LobbyHeaderStats {
  if (useSampleData) {
    return {
      playersOnline: LOBBY_CONFIG.headerStats.playersOnline,
      activeMatches: LOBBY_CONFIG.headerStats.activeMatches,
      openTables: LOBBY_CONFIG.headerStats.openTables,
      balance: LOBBY_CONFIG.user.balance,
    };
  }
  const playerCount = rooms.reduce((sum, room) => sum + Math.max(0, room.currentPlayers ?? 0), 0);
  const activeMatches = rooms.filter(room => {
    const status = room.gameStatus ?? room.status;
    return status === 'active' || status === 'live' || status === 'starting' || status === 'in-progress';
  }).length;
  return {
    playersOnline: String(playerCount),
    activeMatches: String(activeMatches),
    openTables: String(rows.length),
    balance: viewer?.balance ?? 'Not connected',
  };
}

function tableRowToFeaturedCard(row: LobbyTableRow): FeaturedCardData {
  const presetKey = presetKeyForRow(row);
  const starterCard = starterCardForPreset(presetKey);
  return {
    cardType: 'room',
    presetKey,
    roomId: row.roomId,
    code: row.code,
    tag: row.tags[0] ?? 'TABLE',
    title: row.title,
    players: row.players,
    countLabel: 'Players',
    entry: row.entry ?? undefined,
    cta: row.action === 'JOIN TABLE' ? 'JOIN' : row.action,
    tone: row.tone,
    ai: row.ai,
    live: row.live,
    badges: row.tags.slice(1, 3),
    variant: row.ai ? 'purple' : row.tone === 'red' ? 'brown' : 'green',
    imageUrl: starterCard?.imageUrl,
  };
}

function sortPlayers(players: LobbyRoomPlayer[] = []): LobbyRoomPlayer[] {
  return [...players].sort((a, b) => (a.seatIndex ?? 99) - (b.seatIndex ?? 99));
}

function roomStatusLabel(room: LobbyRoomLike): string {
  const status = room.gameStatus ?? room.status ?? 'waiting';
  if (status === 'starting') return room.matchId ? `STARTING ${room.matchId.slice(-6)}` : 'STARTING';
  return status.toUpperCase();
}

function playerSeatLabel(player: LobbyRoomPlayer | undefined): string {
  if (!player) return 'Open Seat';
  return player.displayName ?? player.userId;
}

function playerBadgeLabel(player: LobbyRoomPlayer | undefined): string {
  if (!player) return 'JOINABLE';
  if (player.isAI) return (player.role ?? 'AI').toUpperCase();
  if (player.isHost) return player.isReady ? 'HOST READY' : 'HOST';
  return player.isReady ? 'READY' : 'NOT READY';
}

function buildSeatList(room: LobbyRoomLike): Array<LobbyRoomPlayer | undefined> {
  const players = sortPlayers(room.players);
  const seatCount = Math.min(8, Math.max(2, room.maxPlayers ?? players.length, players.length));
  return Array.from({ length: seatCount }, (_, index) => players.find(player => (player.seatIndex ?? index) === index));
}

function filtersForModeTab(title: string, current: LobbyRoomListFilterDraft | undefined): LobbyRoomListFilterDraft {
  const base = {
    status: current?.status ?? 'waiting',
    sort: current?.sort ?? 'newest',
    search: current?.search,
    visibility: current?.visibility,
  } satisfies LobbyRoomListFilterDraft;
  if (title === 'REAL PLAYERS' || title === 'NO AI ALLOWED') return { ...base, allowAI: false, mode: undefined, stakeType: undefined };
  if (title === 'AI VS AI BENCHMARK') return { ...base, mode: 'benchmark', allowAI: true, stakeType: undefined };
  if (title === 'TRAINING (AI GUIDE)') return { ...base, mode: 'training', allowAI: true, stakeType: undefined };
  if (title === 'STAKES / ENTRY') return { ...base, mode: 'stakes', stakeType: 'game-coin', allowAI: undefined };
  return { ...base, mode: undefined, stakeType: undefined, allowAI: undefined };
}

function filtersForActivePreset(presetKey: string | null, current: LobbyRoomListFilterDraft | undefined): LobbyRoomListFilterDraft {
  const base = {
    status: current?.status ?? 'waiting',
    sort: current?.sort ?? 'newest',
    search: current?.search,
    visibility: current?.visibility,
  } satisfies LobbyRoomListFilterDraft;
  if (!presetKey || presetKey === 'all') return { ...base, mode: undefined, stakeType: undefined, allowAI: undefined };
  if (presetKey === 'ai-showdown') return { ...base, mode: 'benchmark', allowAI: true };
  if (presetKey === 'ai-coach') return { ...base, mode: 'training', allowAI: true };
  if (presetKey === 'high-stake') return { ...base, mode: 'stakes', stakeType: 'game-coin' };
  if (presetKey === 'ranked' || presetKey === 'master') return { ...base, mode: 'ranked', allowAI: false };
  if (presetKey === 'casual') return { ...base, mode: 'casual' };
  return { ...base, allowAI: true };
}

function addAIRoleForRoom(room: LobbyRoomLike): LobbyAddAISeatDraft['aiRole'] {
  if (room.mode === 'training') return 'coach';
  if (room.mode === 'benchmark') return 'benchmark';
  return 'opponent';
}

function JoinedRoomPanel({
  room,
  viewerUserId,
  mainB,
  controls,
  tableRows,
  chatMessages,
  chatDraft,
  busyRoomId,
  onChatDraftChange,
  onReadyRoom,
  onUnreadyRoom,
  onStartRoom,
  onAddAIRoom,
  onSendRoomChat,
  onShareRoomCode,
  onLeaveRoom,
  onJoinRoom,
  onSpectateRoom,
}: {
  room: LobbyRoomLike;
  viewerUserId?: string;
  mainB: LobbyPanelRect;
  controls: LobbyPageSvgControls;
  tableRows: LobbyTableRow[];
  chatMessages: LobbyChatMessageItem[];
  chatDraft: string;
  busyRoomId: string | null;
  onChatDraftChange: (value: string) => void;
  onReadyRoom?: (roomId: string) => void;
  onUnreadyRoom?: (roomId: string) => void;
  onStartRoom?: (roomId: string) => void;
  onAddAIRoom?: (roomId: string, draft?: LobbyAddAISeatDraft) => void;
  onSendRoomChat?: (message: string) => void;
  onShareRoomCode?: (room: LobbyRoomLike) => void;
  onLeaveRoom: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
  onSpectateRoom: (roomId: string) => void;
}) {
  const roomId = room.roomId ?? '';
  const x = mainB.x + 30;
  const y = controls.mainBody.featuredY;
  const w = mainB.w - 60;
  const h = Math.min(440, Math.max(330, controls.mainBody.featuredH + 92));
  const leftW = Math.max(420, w * 0.56);
  const rightX = x + leftW + 22;
  const rightW = Math.max(260, w - leftW - 22);
  const seats = buildSeatList(room);
  const viewerSeat = viewerUserId ? room.players?.find(player => player.userId === viewerUserId && !player.isAI) : undefined;
  const humanPlayers = room.players?.filter(player => !player.isAI) ?? [];
  const allHumansReady = humanPlayers.length >= 2 && humanPlayers.every(player => player.isReady);
  const isHost = Boolean(viewerSeat?.isHost);
  const isReady = Boolean(viewerSeat?.isReady);
  const chatItems = chatMessages.slice(-4);
  const openRows = tableRows.filter(row => row.roomId && row.roomId !== roomId && !row.full).slice(0, 3);
  const seatCols = Math.min(4, Math.max(2, seats.length));
  const seatW = (leftW - 28 - (seatCols - 1) * 10) / seatCols;
  const seatH = 74;
  const disabled = busyRoomId === roomId;
  const canAddAI = Boolean(onAddAIRoom && room.allowAI && isHost && !disabled && roomId && (room.currentPlayers ?? room.players?.length ?? 0) < (room.maxPlayers ?? 0));

  return (
    <g>
      <Panel x={x} y={y} w={w} h={h} r={14} fill="#071426" stroke="#2cecff" strokeWidth={1.1} glow>
        <rect x={x + 10} y={y + 10} width={w - 20} height={58} rx={10} fill="#0b2034" stroke="#244b68" strokeWidth="1" />
        <Txt x={x + 28} y={y + 35} text={room.roomName ?? 'Waiting Room'} maxWidth={leftW - 120} size={22} weight="950" />
        <Txt x={x + 30} y={y + 57} text={`${room.mode ?? 'casual'} / ${room.visibility ?? 'public'} / ${room.region ?? 'global'}`} maxWidth={leftW - 80} size={11} fill="#9dc7d9" opacity={0.86} />
        <g transform={`translate(${x + w - 260} ${y + 20})`}>
          <rect width="232" height="34" rx="8" fill="#0f1c2b" stroke="#365773" strokeWidth="1" />
          <Txt x={14} y={21} text={roomStatusLabel(room)} maxWidth={126} size={11} weight="900" fill="#ffda74" />
          <Txt x={150} y={21} text={`v${room.stateVersion ?? 0}`} maxWidth={58} size={11} weight="850" fill="#74e8ff" />
        </g>

        <g transform={`translate(${x + 14} ${y + 84})`}>
          {seats.map((player, index) => {
            const col = index % seatCols;
            const row = Math.floor(index / seatCols);
            const sx = col * (seatW + 10);
            const sy = row * (seatH + 10);
            const readyColor = player?.isReady ? '#4effb1' : player?.isAI ? '#b987ff' : '#ffca4b';
            return (
              <g key={`${player?.userId ?? 'open'}-${index}`} transform={`translate(${sx} ${sy})`}>
                <rect width={seatW} height={seatH} rx="9" fill={player ? '#0c1e2f' : '#08131f'} stroke={player ? readyColor : '#2b4159'} strokeWidth="1" strokeDasharray={player ? undefined : '6 5'} />
                <Avatar cx={26} cy={37} r={19} bot={Boolean(player?.isAI)} open={!player} ring={readyColor} />
                <Txt x={54} y={31} text={playerSeatLabel(player)} maxWidth={seatW - 66} size={12} weight="900" />
                <Txt x={54} y={51} text={playerBadgeLabel(player)} maxWidth={seatW - 66} size={9} weight="850" fill={readyColor} />
              </g>
            );
          })}
        </g>

        <g transform={`translate(${x + 14} ${y + h - 80})`}>
          <Btn x={0} y={0} w={102} h={38} label={isReady ? 'UNREADY' : 'READY'} tone={isReady ? 'gold' : 'cyan'} active={!disabled} disabled={!roomId || disabled || !viewerSeat} onClick={() => {
            if (!roomId || !viewerSeat) return;
            if (isReady) onUnreadyRoom?.(roomId);
            else onReadyRoom?.(roomId);
          }} />
          <Btn x={112} y={0} w={106} h={38} label="START" tone="gold" active={isHost && allHumansReady} disabled={!roomId || disabled || !isHost || !allHumansReady} onClick={() => roomId && onStartRoom?.(roomId)} />
          <Btn x={228} y={0} w={94} h={38} label="LEAVE" tone="red" active disabled={!roomId || disabled} onClick={() => roomId && onLeaveRoom(roomId)} />
          <Btn x={332} y={0} w={92} h={38} label="SHARE" tone="purple" active disabled={!onShareRoomCode || !roomId} onClick={() => onShareRoomCode?.(room)} />
          <Btn x={434} y={0} w={88} h={38} label="ADD AI" tone="purple" active={canAddAI} disabled={!canAddAI} onClick={() => roomId && onAddAIRoom?.(roomId, { aiRole: addAIRoleForRoom(room), difficulty: 'normal' })} />
          <Txt x={0} y={58} text={`CODE ${room.joinCode ?? room.roomId ?? ''}`} maxWidth={250} size={11} weight="850" fill="#9dc7d9" />
          <Txt x={268} y={58} text={`${room.stakeType ?? 'free'} / ${room.stakeStatus ?? 'none'} / ${room.chainStatus ?? 'local'}`} maxWidth={300} size={11} weight="850" fill="#9dc7d9" />
        </g>

        <g transform={`translate(${rightX} ${y + 84})`}>
          <Txt x={0} y={0} text="ROOM CHAT" maxWidth={rightW} size={13} weight="950" fill="#80eaff" />
          <rect x={0} y={14} width={rightW} height={124} rx="10" fill="#06121e" stroke="#263d58" strokeWidth="1" />
          {chatItems.length === 0 ? (
            <CenterTxt x={0} y={14} w={rightW} h={124} text="No table messages yet" size={11} fill="#83a3b4" opacity={0.78} />
          ) : chatItems.map((message, index) => (
            <g key={`${message.name}-${message.msg}-${index}`} transform={`translate(14 ${36 + index * 25})`}>
              <Txt x={0} y={0} text={message.name} maxWidth={82} size={10} weight="900" fill="#ffda74" />
              <Txt x={88} y={0} text={message.msg} maxWidth={rightW - 116} size={10} fill="#dcefff" />
            </g>
          ))}
          <foreignObject x={0} y={150} width={rightW} height={44}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const next = chatDraft.trim();
                if (!next) return;
                onSendRoomChat?.(next);
                onChatDraftChange('');
              }}
              style={{ display: 'flex', height: '38px', gap: '6px' }}
            >
              <input
                aria-label="Room chat message"
                value={chatDraft}
                maxLength={180}
                onChange={(event) => onChatDraftChange(event.currentTarget.value)}
                style={{ flex: 1, minWidth: 0, border: '1px solid #2b526e', borderRadius: '8px', background: '#06121e', color: '#edf7ff', font: '600 12px Inter, sans-serif', padding: '0 10px', outline: 'none' }}
              />
              <button
                type="submit"
                disabled={!onSendRoomChat}
                style={{ width: '58px', border: '1px solid #20e6ff', borderRadius: '8px', background: '#0a2a3e', color: '#f5fdff', font: '850 11px Inter, sans-serif' }}
              >
                SEND
              </button>
            </form>
          </foreignObject>
          <Txt x={0} y={222} text="OPEN TABLES" maxWidth={rightW} size={13} weight="950" fill="#80eaff" />
          {openRows.length === 0 ? (
            <Txt x={0} y={248} text="No other open tables in this shard." maxWidth={rightW} size={11} fill="#83a3b4" />
          ) : openRows.map((row, index) => {
            const rowY = 236 + index * 49;
            return (
              <g key={row.code} transform={`translate(0 ${rowY})`}>
                <rect width={rightW} height="40" rx="8" fill="#081827" stroke="#223a52" strokeWidth="1" />
                <Txt x={12} y={17} text={row.title} maxWidth={rightW - 108} size={11} weight="900" />
                <Txt x={12} y={32} text={`${row.players} / ${row.tags[0] ?? 'TABLE'}`} maxWidth={rightW - 108} size={9} fill="#9dc7d9" />
                <Btn x={rightW - 82} y={7} w={70} h={26} label={row.live ? 'WATCH' : 'JOIN'} tone={row.live ? 'purple' : 'cyan'} active disabled={Boolean(row.roomId && busyRoomId === row.roomId)} onClick={() => {
                  if (!row.roomId) return;
                  if (row.live) onSpectateRoom(row.roomId);
                  else onJoinRoom(row.roomId);
                }} />
              </g>
            );
          })}
        </g>
      </Panel>
    </g>
  );
}

export function LobbyPageSvgSurface({
  loading,
  creating,
  error,
  gameId,
  gameName,
  rooms,
  busyRoomId,
  onRefresh,
  onCreateRoom,
  onQuickJoin,
  onJoinRoom,
  onJoinRoomCode,
  onSpectateRoom,
  onLeaveRoom,
  onReadyRoom,
  onUnreadyRoom,
  onStartRoom,
  onAddAIRoom,
  onSendRoomChat,
  onSendLobbyChat,
  onAddFriend,
  onInviteFriend,
  onCreateParty,
  onLeaveParty: onLeavePartyService,
  onClaimReward,
  onSelectServer,
  onRefreshLobbyServices,
  onShareRoomCode,
  onMatchmaking,
  filters,
  onFilterRooms,
  onNavigate,
  onWallet,
  controls: controlsInput,
  useSampleData = false,
  viewer,
  viewerUserId,
  joinedRoom,
  friends,
  chatMessages,
  lobbyChatMessages,
  reward,
  party,
  server,
  minPlayers,
  maxPlayers,
  gameTagline,
  heroMedia,
}: LobbyPageSvgSurfaceProps) {
  const controls = useMemo(() => normalizeLobbyPageSvgControls(controlsInput), [controlsInput]);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hostSize, setHostSize] = useState({ w: W, h: H });
  const [selectedMode, setSelectedMode] = useState<string>(MODE_TABS[0][0]);
  const [selectedFriendsTab, setSelectedFriendsTab] = useState('FRIENDS');
  const [selectedFeaturedTab, setSelectedFeaturedTab] = useState('FEATURED');
  const [featuredScroll, setFeaturedScroll] = useState(0);
  const [tableScroll, setTableScroll] = useState(0);
  const [playersPopupRow, setPlayersPopupRow] = useState<LobbyTableRow | null>(null);
  const [actionPopup, setActionPopup] = useState<string | null>(null);
  const [featuredCardPopup, setFeaturedCardPopup] = useState<FeaturedCardData | null>(null);
  const [filterPopup, setFilterPopup] = useState(false);
  const [serverOpen, setServerOpen] = useState(false);
  const [activeNowFilter, setActiveNowFilter] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [seatedByRow, setSeatedByRow] = useState<Record<string, number>>({});
  const [chatDraft, setChatDraft] = useState('');
  const [lobbyChatDraft, setLobbyChatDraft] = useState('');
  const [friendSearchDraft, setFriendSearchDraft] = useState('');
  const hasPopup = Boolean(playersPopupRow || actionPopup || featuredCardPopup || filterPopup);
  const leftVisible = !leftCollapsed;
  const rightVisible = !rightCollapsed;
  useLayoutEffect(() => {
    const node = hostRef.current;
    if (!node) return undefined;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setHostSize({ w: rect.width, h: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const resolvedLayout = useMemo(() => {
    const aspect = hostSize.w > 0 && hostSize.h > 0 ? hostSize.w / hostSize.h : W / H;
    const canvasW = Math.max(W, H * aspect);
    const extraW = canvasW - W;
    const sideGrow = Math.min(120, extraW * 0.14);
    const rightMargin = Math.max(0, W - controls.rightPanel.x - controls.rightPanel.w);
    const leftPanel = {
      x: controls.leftPanel.x,
      y: controls.leftPanel.y,
      w: controls.leftPanel.w + sideGrow,
      h: controls.leftPanel.h,
    };
    const rightPanel = {
      x: canvasW - controls.rightPanel.w - sideGrow - rightMargin,
      y: controls.rightPanel.y,
      w: controls.rightPanel.w + sideGrow,
      h: controls.rightPanel.h,
    };
    const mainX = leftVisible ? leftPanel.x + leftPanel.w : leftPanel.x;
    const mainRight = rightVisible ? rightPanel.x : canvasW - rightMargin;
    return {
      canvasW,
      leftPanel,
      rightPanel,
      mainB: { x: mainX, y: 0, w: mainRight - mainX, h: controls.layout.mainHeight - 16 },
    };
  }, [controls.leftPanel.h, controls.leftPanel.w, controls.leftPanel.x, controls.leftPanel.y, controls.layout.mainHeight, controls.rightPanel.h, controls.rightPanel.w, controls.rightPanel.x, controls.rightPanel.y, hostSize.h, hostSize.w, leftVisible, rightVisible]);
  const { canvasW, leftPanel, rightPanel, mainB } = resolvedLayout;
  const canvas = { x: 0, y: 0, w: canvasW, h: H };
  const activeViewer = useSampleData ? sampleViewer : viewer ?? null;
  const activeJoinedRoom = useMemo(
    () => (useSampleData ? null : joinedRoom ?? rooms.find(room => room.viewerJoined) ?? null),
    [joinedRoom, rooms, useSampleData],
  );
  const tableRows = useMemo(() => {
    const runtimeRows = rooms.slice(0, 6).map(roomToTableRow);
    const mergedRows = useSampleData ? (runtimeRows.length > 0 ? [...runtimeRows, ...DEFAULT_TABLE_ROWS] : DEFAULT_TABLE_ROWS) : runtimeRows;
    return mergedRows.map(row => {
      const seatedIndex = seatedByRow[row.code];
      if (seatedIndex === undefined) return row;
      const names = [...row.names];
      if (/open/i.test(names[seatedIndex] || '')) names[seatedIndex] = activeViewer?.name ?? 'You';
      return { ...row, names };
    });
  }, [activeViewer?.name, rooms, seatedByRow, useSampleData]);
  const headerStats = useMemo(() => buildHeaderStats({ rows: tableRows, rooms, viewer: activeViewer, useSampleData }), [activeViewer, rooms, tableRows, useSampleData]);
  const featuredCards = useMemo(() => {
    const cards = [
      ...tableRows.map(tableRowToFeaturedCard),
      ...DEFAULT_FEATURED_CARDS,
    ];
    return activeNowFilter ? cards.filter(card => card.presetKey === activeNowFilter) : cards;
  }, [activeNowFilter, tableRows]);
  const activeFilters = useMemo<LobbyActiveFilterItem[]>(
    () => (useSampleData
      ? ACTIVE_FILTERS.map(([presetKey, label, count, color, ai, live, create, imageUrl]) => ({ presetKey, label, count, color, ai, live, create, imageUrl }))
      : buildRuntimeActiveFilters(tableRows)),
    [tableRows, useSampleData],
  );
  const rightRailFriends = useMemo<LobbyFriendItem[]>(
    () => (useSampleData ? FRIENDS.map(([name, state, avatarUrl]) => ({ name, state, avatarUrl })) : friends ?? []),
    [friends, useSampleData],
  );
  const rightRailMessages = useMemo<LobbyChatMessageItem[]>(
    () => (useSampleData ? LOBBY_CHAT_MESSAGES.map(([name, msg, ago, avatarUrl]) => ({ name, msg, ago, avatarUrl })) : lobbyChatMessages ?? []),
    [lobbyChatMessages, useSampleData],
  );
  const roomChatMessages = useMemo<LobbyChatMessageItem[]>(
    () => (useSampleData ? LOBBY_CHAT_MESSAGES.map(([name, msg, ago, avatarUrl]) => ({ name, msg, ago, avatarUrl })) : chatMessages ?? []),
    [chatMessages, useSampleData],
  );
  const serverStatus = useMemo<LobbyServerStatus | null>(
    () => (useSampleData
      ? {
        active: LOBBY_CONFIG.server.active,
        ping: LOBBY_CONFIG.server.ping,
        options: LOBBY_CONFIG.server.options.map(([name, ping, active]) => ({ name, ping, active })),
      }
      : server ?? null),
    [server, useSampleData],
  );

  const takeSeat = (code: string, seatIndex: number) => {
    const row = tableRows.find(item => item.code === code);
    if (row?.roomId) {
      onJoinRoom(row.roomId);
      setPlayersPopupRow(null);
      return;
    }
    setSeatedByRow(previous => ({ ...previous, [code]: seatIndex }));
    setPlayersPopupRow(null);
  };
  const selectModeTab = (mode: string) => {
    setSelectedMode(mode);
    setActiveNowFilter(null);
    onFilterRooms?.(filtersForModeTab(mode, filters));
  };
  const selectActiveFilter = (filter: string | null) => {
    setActiveNowFilter(filter);
    setSelectedFeaturedTab('FEATURED');
    onFilterRooms?.(filtersForActivePreset(filter, filters));
  };

  return (
    <div ref={hostRef} style={{ width: '100%', height: '100%', minHeight: 0, display: 'block', overflow: 'hidden', backgroundColor: 'transparent' }}>
      <svg
        viewBox={`-14 -14 ${canvasW + 28} ${H + 28}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block', background: 'transparent' }}
        role="img"
        aria-label={`${gameId || 'Claim'} lobby page layout`}
      >
        <Defs />
        <style>{`
          .lobby-ui-hit { cursor: pointer; transition: transform 160ms ease, opacity 160ms ease, filter 160ms ease; transform-box: fill-box; transform-origin: center; }
          .lobby-ui-hit:hover { transform: translateY(-1px); filter: url(#lobbyCyanGlow); }
          .lobby-ui-hit:active { transform: translateY(1px) scale(0.985); }
          .lobby-featured-card:hover { transform: scale(1.065); filter: url(#lobbyPurpleGlow); }
          .lobby-all-table-row:hover { transform: scale(1.016); filter: url(#lobbyPurpleGlow); }
          .lobby-side-handle:hover, .lobby-layout-icon:hover { transform: scale(1.04); filter: url(#lobbyPurpleGlow); }
          .lobby-left-panel-motion, .lobby-right-panel-motion { transition: transform ${controls.layout.sidePanelAnimMs}ms cubic-bezier(.16,.84,.28,1), opacity ${Math.max(120, controls.layout.sidePanelAnimMs - 140)}ms ease, filter ${Math.max(120, controls.layout.sidePanelAnimMs - 80)}ms ease; transform-box: view-box; transform-origin: center; }
          .lobby-left-panel-motion.is-visible, .lobby-right-panel-motion.is-visible { transform: translateX(0); opacity: 1; }
          .lobby-left-panel-motion.is-hidden { transform: translateX(-286px); opacity: 0; filter: blur(2px); }
          .lobby-right-panel-motion.is-hidden { transform: translateX(326px); opacity: 0; filter: blur(2px); }
          .lobby-spinner-wheel { transition-property: transform; transition-timing-function: cubic-bezier(.08,.72,.08,1); transform-box: view-box; }
          .lobby-spinner-wheel.is-spinning { filter: url(#lobbyGoldGlow); }
          .lobby-spinner-center-button { transition: filter 180ms ease, transform 180ms ease; transform-box: fill-box; transform-origin: center; }
          .lobby-spinner-center-button:hover { filter: url(#lobbyCyanGlow); transform: scale(1.025); }
          .lobby-spinner-center-button:hover .lobby-spinner-center-hover-ring { opacity: 0.18; }
          .lobby-spinner-wheel.is-spinning .lobby-spinner-ring-blue { animation: lobbySpinnerRingPulseBlue 520ms ease-in-out infinite alternate; }
          .lobby-spinner-wheel.is-spinning .lobby-spinner-ring-purple { animation: lobbySpinnerRingPulsePurple 430ms ease-in-out infinite alternate; }
          .lobby-spinner-wheel.is-spinning .lobby-spinner-ring-dark { animation: lobbySpinnerRingPulseDark 620ms ease-in-out infinite alternate; }
          .lobby-hero-slide { opacity: 0; animation-name: lobbyHeroCrossDissolve; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
          @keyframes lobbySpinnerRingPulseBlue {
            from { stroke-width: 2.4; opacity: 0.72; filter: url(#lobbyCyanGlow); }
            to { stroke-width: 5.2; opacity: 1; filter: url(#lobbyCyanGlow); }
          }
          @keyframes lobbySpinnerRingPulsePurple {
            from { stroke-width: 4.2; opacity: 0.62; filter: url(#lobbyPurpleGlow); }
            to { stroke-width: 7.2; opacity: 1; filter: url(#lobbyPurpleGlow); }
          }
          @keyframes lobbySpinnerRingPulseDark {
            from { stroke: #193b5a; stroke-width: 5; opacity: 0.65; }
            to { stroke: #12eaff; stroke-width: 6.5; opacity: 0.95; }
          }
          @keyframes lobbyHeroCrossDissolve {
            0% { opacity: 0; }
            8% { opacity: 0.62; }
            34% { opacity: 0.62; }
            44% { opacity: 0; }
            100% { opacity: 0; }
          }
        `}</style>
        <g filter={hasPopup ? 'url(#lobbyPopupBgBlur)' : undefined} opacity={hasPopup ? controls.layout.popupBlurOpacity : 1} pointerEvents={hasPopup ? 'none' : 'auto'}>
          <Panel x={mainB.x} y={mainB.y} w={mainB.w} h={mainB.h} r={{ tl: controls.layout.mainRadius, tr: controls.layout.mainRadius, br: 0, bl: 0 }} stroke={controls.colors.panelStroke} fill="url(#lobbyPanelWarm)" shine={false} strokeWidth={controls.layout.panelStrokeWidth} />
          <g className={`lobby-left-panel-motion ${leftVisible ? 'is-visible' : 'is-hidden'}`} pointerEvents={leftVisible ? 'auto' : 'none'}>
            <Sidebar
              controls={controls}
              panel={leftPanel}
              useSampleData={useSampleData}
              onOpenActionPopup={setActionPopup}
              onNavigate={onNavigate}
              reward={reward}
              renderRewardBadge={({ x, y, w, h, reward: rewardStatus, onOpen }) => (
                <DailySpinBadgeSvg
                  x={x}
                  y={y}
                  w={w}
                  h={h}
                  reward={rewardStatus}
                  onOpen={onOpen}
                />
              )}
            />
          </g>
          <Header
            mainB={mainB}
            leftVisible={leftVisible}
            rightVisible={rightVisible}
            onToggleLeft={() => setLeftCollapsed(value => !value)}
            onToggleRight={() => setRightCollapsed(value => !value)}
            onWallet={onWallet}
            controls={controls}
            gameTitle={(gameName ?? LOBBY_CONFIG.game.title).toUpperCase()}
            gameSubtitle={gameTagline}
            heroMedia={heroMedia}
            stats={headerStats}
          />
          <ModeTabs selectedMode={selectedMode} onSelectMode={selectModeTab} mainB={mainB} controls={controls} />
          {activeJoinedRoom ? (
            <JoinedRoomPanel
              room={activeJoinedRoom}
              viewerUserId={viewerUserId}
              mainB={mainB}
              controls={controls}
              tableRows={tableRows}
              chatMessages={roomChatMessages}
              chatDraft={chatDraft}
              busyRoomId={busyRoomId}
              onChatDraftChange={setChatDraft}
              onReadyRoom={onReadyRoom}
              onUnreadyRoom={onUnreadyRoom}
              onStartRoom={onStartRoom}
              onAddAIRoom={onAddAIRoom}
              onSendRoomChat={onSendRoomChat}
              onShareRoomCode={onShareRoomCode}
              onLeaveRoom={onLeaveRoom}
              onJoinRoom={onJoinRoom}
              onSpectateRoom={onSpectateRoom}
            />
          ) : (
            <Featured
              selectedFeaturedTab={selectedFeaturedTab}
              onSelectFeaturedTab={setSelectedFeaturedTab}
              tableRows={tableRows}
              tableScroll={tableScroll}
              onTableScroll={setTableScroll}
              onOpenPlayers={setPlayersPopupRow}
              onOpenFeaturedCard={setFeaturedCardPopup}
              onOpenFilter={() => setFilterPopup(true)}
              onRefresh={onRefresh}
              onJoinRoom={onJoinRoom}
              onLeaveRoom={onLeaveRoom}
              onSpectateRoom={onSpectateRoom}
              busyRoomId={busyRoomId}
              filters={filters}
              mainB={mainB}
              controls={controls}
              featuredCards={featuredCards}
              featuredScroll={featuredScroll}
              onFeaturedScroll={setFeaturedScroll}
            />
          )}
          {selectedFeaturedTab === 'FEATURED' && !activeJoinedRoom ? (
            <ActiveNow mainB={mainB} controls={controls} y={controls.mainBody.filtersY} items={activeFilters} activeFilter={activeNowFilter} onSelectFilter={selectActiveFilter} />
          ) : null}
          <g className={`lobby-right-panel-motion ${rightVisible ? 'is-visible' : 'is-hidden'}`} pointerEvents={rightVisible ? 'auto' : 'none'}>
            <RightRail
              controls={controls}
              panel={rightPanel}
              selectedFriendsTab={selectedFriendsTab}
              onSelectFriendsTab={setSelectedFriendsTab}
              viewer={activeViewer}
              friends={rightRailFriends}
              chatMessages={rightRailMessages}
              systemMessage={useSampleData ? 'High Stakes table is now full.' : null}
              onNavigate={onNavigate}
              party={party}
              friendSearchDraft={friendSearchDraft}
              lobbyChatDraft={lobbyChatDraft}
              onFriendSearchDraftChange={setFriendSearchDraft}
              onLobbyChatDraftChange={setLobbyChatDraft}
              onAddFriend={(friendId) => {
                onAddFriend?.(friendId);
                setFriendSearchDraft('');
              }}
              onInviteFriend={onInviteFriend}
              onCreateParty={onCreateParty}
              onLeaveParty={onLeavePartyService}
              onSendLobbyChat={(message) => {
                onSendLobbyChat?.(message);
                setLobbyChatDraft('');
              }}
              onRefreshLobbyServices={onRefreshLobbyServices}
            />
          </g>
          <FooterStatus serverOpen={serverOpen} onToggleServer={() => setServerOpen(value => !value)} mainB={mainB} controls={controls} server={serverStatus} onSelectServer={onSelectServer} />
          <OuterShellGlow mainB={mainB} controls={controls} leftPanel={leftPanel} rightPanel={rightPanel} leftVisible={leftVisible} rightVisible={rightVisible} />
          <StatusOverlay loading={loading} error={error} creating={creating} canvas={canvas} />
        </g>
        <PlayersPopup row={playersPopupRow} onClose={() => setPlayersPopupRow(null)} onTakeSeat={takeSeat} canvas={canvas} viewer={activeViewer} useSampleData={useSampleData} />
        <ActionPopup
          type={actionPopup === 'spinner' ? null : actionPopup}
          onClose={() => setActionPopup(null)}
          onCreateRoom={onCreateRoom}
          onQuickJoin={onQuickJoin}
          onJoinRoomCode={onJoinRoomCode}
          onMatchmaking={onMatchmaking}
          canvas={canvas}
          viewer={activeViewer}
          useSampleData={useSampleData}
          minPlayers={minPlayers}
          maxPlayers={maxPlayers}
        />
        <DailySpinSpinnerSvg
          open={actionPopup === 'spinner'}
          onClose={() => setActionPopup(null)}
          canvas={canvas}
          reward={reward}
          onSpin={onClaimReward}
        />
        <FeaturedCardPopup
          card={featuredCardPopup}
          onClose={() => setFeaturedCardPopup(null)}
          canvas={canvas}
          onPrimaryAction={(card) => {
            if (card.cardType === 'starter') onCreateRoom(starterDraftForCard(card));
            else if (card.roomId && card.cta === 'LEAVE TABLE') onLeaveRoom(card.roomId);
            else if (card.roomId && card.cta !== 'FULL') onJoinRoom(card.roomId);
          }}
          onSecondaryAction={(card) => {
            if (card.cardType === 'starter') setActionPopup('createTable');
            else if (card.roomId) onSpectateRoom(card.roomId);
          }}
        />
        <FilterPopup open={filterPopup} onClose={() => setFilterPopup(false)} canvas={canvas} filters={filters} onApply={(nextFilters) => {
          setSelectedFeaturedTab('ALL TABLES');
          setActiveNowFilter(null);
          onFilterRooms?.(nextFilters);
        }} />
      </svg>
    </div>
  );
}

function OuterShellGlow({
  mainB,
  controls,
  leftPanel,
  rightPanel,
  leftVisible,
  rightVisible,
}: {
  mainB: { x: number; y: number; w: number; h: number };
  controls: LobbyPageSvgControls;
  leftPanel: LobbyPanelRect;
  rightPanel: LobbyPanelRect;
  leftVisible: boolean;
  rightVisible: boolean;
}) {
  const mainPath = roundedRectPath(mainB.x, mainB.y, mainB.w, mainB.h, { tl: 12, tr: 12, br: 0, bl: 0 });
  const leftPath = roundedRectPath(leftPanel.x, leftPanel.y, leftPanel.w, leftPanel.h, { tl: 12, tr: 0, br: 0, bl: 12 });
  const rightPath = roundedRectPath(rightPanel.x, rightPanel.y, rightPanel.w, rightPanel.h, { tl: 0, tr: 12, br: 12, bl: 0 });
  const paths = [leftVisible ? leftPath : null, mainPath, rightVisible ? rightPath : null].filter((path): path is string => Boolean(path));
  return (
    <g pointerEvents="none" opacity={controls.layout.outerGlowOpacity}>
      {paths.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke="#071725" strokeWidth="4" opacity="1" />
          <path d={d} fill="none" stroke={controls.colors.panelStroke} strokeWidth="1.25" opacity="1" />
          <path d={d} fill="none" stroke="#b9eeff" strokeWidth="0.45" opacity="0.72" />
          <path d={d} fill="none" stroke={controls.colors.purple} strokeWidth="0.45" opacity="0.32" transform="translate(0 1)" />
        </g>
      ))}
    </g>
  );
}
