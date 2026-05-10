import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { avatarImageById } from '@ocentra/app-assets/avatars';
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
  Defs,
  Panel,
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
  type LobbyActiveFilterItem,
  type LobbyChatMessageItem,
  type LobbyCreateRoomDraft,
  type LobbyFriendItem,
  type LobbyHeaderStats,
  type LobbyHeroMedia,
  type LobbyJoinCodeDraft,
  type LobbyPanelRect,
  type LobbyQuickJoinDraft,
  type LobbyRoomLike,
  type LobbyServerStatus,
  type LobbyTableRow,
  type LobbyUserSummary,
} from './LobbyPageSvgTypes';
import {
  ActionPopup,
  FeaturedCardPopup,
  FilterPopup,
  PlayersPopup,
  SpinnerPopup,
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
  onMatchmaking: () => void;
  controls?: Partial<LobbyPageSvgControls> | null;
  useSampleData?: boolean;
  viewer?: LobbyUserSummary | null;
  friends?: LobbyFriendItem[];
  chatMessages?: LobbyChatMessageItem[];
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

export function LobbyPageSvgSurface({
  loading,
  creating,
  error,
  gameId,
  gameName,
  rooms,
  busyRoomId,
  onCreateRoom,
  onQuickJoin,
  onJoinRoom,
  onJoinRoomCode,
  onSpectateRoom,
  onLeaveRoom,
  onMatchmaking,
  controls: controlsInput,
  useSampleData = false,
  viewer,
  friends,
  chatMessages,
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
            <Sidebar controls={controls} panel={leftPanel} useSampleData={useSampleData} onOpenActionPopup={setActionPopup} />
          </g>
          <Header
            mainB={mainB}
            leftVisible={leftVisible}
            rightVisible={rightVisible}
            onToggleLeft={() => setLeftCollapsed(value => !value)}
            onToggleRight={() => setRightCollapsed(value => !value)}
            controls={controls}
            gameTitle={(gameName ?? LOBBY_CONFIG.game.title).toUpperCase()}
            gameSubtitle={gameTagline}
            heroMedia={heroMedia}
            stats={headerStats}
          />
          <ModeTabs selectedMode={selectedMode} onSelectMode={setSelectedMode} mainB={mainB} controls={controls} />
          <Featured
            selectedFeaturedTab={selectedFeaturedTab}
            onSelectFeaturedTab={setSelectedFeaturedTab}
            tableRows={tableRows}
            tableScroll={tableScroll}
            onTableScroll={setTableScroll}
            onOpenPlayers={setPlayersPopupRow}
            onOpenFeaturedCard={setFeaturedCardPopup}
            onOpenFilter={() => setFilterPopup(true)}
            onJoinRoom={onJoinRoom}
            onLeaveRoom={onLeaveRoom}
            onSpectateRoom={onSpectateRoom}
            busyRoomId={busyRoomId}
            mainB={mainB}
            controls={controls}
            featuredCards={featuredCards}
            featuredScroll={featuredScroll}
            onFeaturedScroll={setFeaturedScroll}
          />
          {selectedFeaturedTab === 'FEATURED' ? (
            <ActiveNow mainB={mainB} controls={controls} y={controls.mainBody.filtersY} items={activeFilters} activeFilter={activeNowFilter} onSelectFilter={filter => {
              setActiveNowFilter(filter);
              setSelectedFeaturedTab('FEATURED');
            }} />
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
            />
          </g>
          <FooterStatus serverOpen={serverOpen} onToggleServer={() => setServerOpen(value => !value)} mainB={mainB} controls={controls} server={serverStatus} />
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
        <SpinnerPopup open={actionPopup === 'spinner'} onClose={() => setActionPopup(null)} controls={controls} canvas={canvas} />
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
        <FilterPopup open={filterPopup} onClose={() => setFilterPopup(false)} canvas={canvas} />
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
