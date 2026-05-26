import { useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import {
  DEFAULT_LEADERBOARD_PAGE_CONTENT,
  normalizeLeaderboardPageContent,
  type LeaderboardContentRow,
  type LeaderboardGameOption,
  type LeaderboardIconName,
  type LeaderboardModeContent,
  type LeaderboardNavItem,
  type LeaderboardPageContentData,
  type LeaderboardPageMode,
  type LeaderboardQuickGame,
  type LeaderboardSeason,
  type LeaderboardTab,
  type LeaderboardTabDetail,
  type LeaderboardTabId,
  type LeaderboardTone,
} from './LeaderboardPageSvgContent';

type LeaderboardContentPanelTab =
  | 'overview'
  | 'modes'
  | 'tabsNav'
  | 'games'
  | 'rows'
  | 'seasonCopy'
  | 'rawJson';
type LeaderboardGameListKey = 'topGames' | 'quickGames';
type LeaderboardRowListKey = 'fallbackRows' | 'aiBenchmarkRows';
type SelectOption<T extends string> = T | { value: T; label: string };

type LeaderboardPageContentControlsPanelProps = {
  content: LeaderboardPageContentData;
  onContentChange: Dispatch<SetStateAction<LeaderboardPageContentData>>;
  onSave?: (content: LeaderboardPageContentData) => Promise<string | void> | string | void;
};

const panelTabs: Array<{ id: LeaderboardContentPanelTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'modes', label: 'Modes' },
  { id: 'tabsNav', label: 'Tabs & Nav' },
  { id: 'games', label: 'Games' },
  { id: 'rows', label: 'Runtime Data' },
  { id: 'seasonCopy', label: 'Season & Copy' },
  { id: 'rawJson', label: 'Raw JSON' },
];
const tabIds: LeaderboardTabId[] = ['overall', 'perGame', 'aiBenchmarks', 'tournaments', 'friends'];
const pageModes: LeaderboardPageMode[] = ['leaderboard', 'gameLeaderboard', 'aiBenchmarkLeaderboard'];
const tones: LeaderboardTone[] = ['cyan', 'gold', 'purple', 'red', 'muted'];
const iconNames: LeaderboardIconName[] = [
  'activity',
  'bot',
  'calendar',
  'circle',
  'coins',
  'crown',
  'gamepad',
  'gift',
  'grid',
  'home',
  'medal',
  'shield',
  'swords',
  'trophy',
  'users',
];
const rowSources: LeaderboardModeContent['rowSource'][] = ['api'];

const shellStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
  color: '#e0fbff',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const tabButtonStyle = (active: boolean): CSSProperties => ({
  appearance: 'none',
  border: '1px solid rgba(84,226,255,.32)',
  borderRadius: '0.45rem',
  background: active ? 'rgba(84,226,255,.2)' : 'rgba(5,18,31,.72)',
  color: active ? '#effcff' : '#bcecff',
  padding: '0.42rem 0.62rem',
  fontWeight: active ? 900 : 750,
  cursor: 'pointer',
});

const cardStyle: CSSProperties = {
  border: '1px solid rgba(84,226,255,.22)',
  borderRadius: '0.55rem',
  background: 'rgba(2,10,19,.66)',
  padding: '0.75rem',
  display: 'grid',
  gap: '0.65rem',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
  gap: '0.65rem',
};

const wideGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))',
  gap: '0.85rem',
  alignItems: 'start',
};

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
  gap: '0.75rem',
};

const summaryCardStyle: CSSProperties = {
  border: '1px solid rgba(84,226,255,.22)',
  borderRadius: '0.55rem',
  background: 'rgba(4,16,29,.72)',
  padding: '0.75rem',
  display: 'grid',
  gap: '0.35rem',
};

const listStyle: CSSProperties = {
  display: 'grid',
  gap: '0.55rem',
};

const listItemStyle = (active: boolean): CSSProperties => ({
  border: `1px solid ${active ? 'rgba(84,226,255,.82)' : 'rgba(84,226,255,.24)'}`,
  borderRadius: '0.55rem',
  background: active ? 'rgba(30,130,160,.24)' : 'rgba(5,18,31,.78)',
  color: '#effcff',
  padding: '0.55rem',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '0.65rem',
  alignItems: 'center',
  textAlign: 'left',
});

const selectButtonStyle: CSSProperties = {
  appearance: 'none',
  border: 0,
  background: 'transparent',
  color: 'inherit',
  padding: 0,
  display: 'grid',
  gap: '0.12rem',
  textAlign: 'left',
  cursor: 'pointer',
  minWidth: 0,
};

const listActionBarStyle: CSSProperties = {
  display: 'flex',
  gap: '0.3rem',
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
};

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.25rem',
  color: '#d9f7ff',
  fontSize: '0.78rem',
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  border: '1px solid rgba(84,226,255,.28)',
  borderRadius: '0.4rem',
  background: 'rgba(4,16,29,.92)',
  color: '#f0fdff',
  padding: '0.45rem 0.55rem',
};

const buttonStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid rgba(84,226,255,.36)',
  borderRadius: '0.4rem',
  background: 'rgba(7,28,44,.84)',
  color: '#dcfbff',
  padding: '0.42rem 0.58rem',
  fontWeight: 850,
  cursor: 'pointer',
};

const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  borderColor: 'rgba(248,113,113,.44)',
  color: '#fecaca',
};

function optionValue<T extends string>(option: SelectOption<T>): T {
  return typeof option === 'string' ? option : option.value;
}

function optionLabel<T extends string>(option: SelectOption<T>): string {
  return typeof option === 'string' ? option : option.label;
}

function linesFromText(value: string): string[] {
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function linesText(value: string[]): string {
  return value.join('\n');
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

function reorder<T>(items: T[], index: number, delta: number): T[] {
  const nextIndex = index + delta;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function numberOrUndefined(value: string): number | undefined {
  if (value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function newTab(id: LeaderboardTabId): LeaderboardTab {
  return {
    id,
    label: id.replace(/([A-Z])/g, ' $1').toUpperCase(),
    title: `${id.replace(/([A-Z])/g, ' $1')} leaderboard`,
  };
}

function newTabDetail(id: LeaderboardTabId): LeaderboardTabDetail {
  return {
    eyebrow: 'Leaderboard scope',
    title: newTab(id).title,
    summary: 'Describe the standings context shown when this tab is active.',
    primary: 'Primary signal',
    secondary: 'Secondary context',
    action: 'Open',
    tone: 'cyan',
  };
}

function newNavItem(tabId: LeaderboardTabId = 'overall'): LeaderboardNavItem {
  return {
    label: 'NEW LEADERBOARD ITEM',
    detail: 'Author the destination and summary.',
    icon: 'trophy',
    tabId,
    tone: 'cyan',
  };
}

function newTopGame(index: number): LeaderboardGameOption {
  return {
    id: `game-${Date.now()}`,
    rank: index + 1,
    name: 'New Game',
    matches: '0',
    growth: '+0%',
    tone: 'cyan',
    category: 'Category',
    subcategory: 'Subcategory',
    gameType: undefined,
    routePath: '/leaderboard',
  };
}

function newQuickGame(): LeaderboardQuickGame {
  return {
    id: `quick-game-${Date.now()}`,
    name: 'NEW GAME',
    detail: 'Leaderboard scope',
    icon: 'gamepad',
    tone: 'cyan',
    category: 'Category',
    subcategory: 'Subcategory',
    gameType: undefined,
    routePath: '/leaderboard',
  };
}

function newSeasonStat(): LeaderboardSeason['stats'][number] {
  return {
    label: 'NEW STAT',
    value: '0',
  };
}

function TextField({
  label,
  value,
  onChange,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <label style={wide ? { ...labelStyle, gridColumn: '1 / -1' } : labelStyle}>
      {label}
      <input style={inputStyle} value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        style={inputStyle}
        value={value ?? ''}
        inputMode="numeric"
        onChange={event => onChange(numberOrUndefined(event.target.value))}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  wide = false,
  minHeight = '6rem',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  minHeight?: string;
}) {
  return (
    <label style={wide ? { ...labelStyle, gridColumn: '1 / -1' } : labelStyle}>
      {label}
      <textarea
        style={{ ...inputStyle, minHeight, resize: 'vertical' }}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <select style={inputStyle} value={value} onChange={event => onChange(event.target.value as T)}>
        {options.map(option => {
          const nextValue = optionValue(option);
          return <option key={nextValue} value={nextValue}>{optionLabel(option)}</option>;
        })}
      </select>
    </label>
  );
}

function leaderboardModeLabel(mode: LeaderboardPageMode): string {
  if (mode === 'gameLeaderboard') return 'Game leaderboard';
  if (mode === 'aiBenchmarkLeaderboard') return 'AI benchmark leaderboard';
  return 'Overall leaderboard';
}

function toneLabel(tone: LeaderboardTone): string {
  return tone[0].toUpperCase() + tone.slice(1);
}

export function LeaderboardPageContentControlsPanel({
  content,
  onContentChange,
  onSave,
}: LeaderboardPageContentControlsPanelProps) {
  const normalized = useMemo(() => normalizeLeaderboardPageContent(content), [content]);
  const [activePanel, setActivePanel] = useState<LeaderboardContentPanelTab>('overview');
  const [mode, setMode] = useState<LeaderboardPageMode>('leaderboard');
  const [tabId, setTabId] = useState<LeaderboardTabId>('overall');
  const [navIndex, setNavIndex] = useState(0);
  const [gameList, setGameList] = useState<LeaderboardGameListKey>('topGames');
  const [gameIndex, setGameIndex] = useState(0);
  const [rowList, setRowList] = useState<LeaderboardRowListKey>('fallbackRows');
  const [rowIndex, setRowIndex] = useState(0);
  const [seasonStatIndex, setSeasonStatIndex] = useState(0);
  const [rawJson, setRawJson] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedMode = normalized.modes[mode];
  const selectedTabIndex = Math.max(0, normalized.tabs.findIndex(tab => tab.id === tabId));
  const selectedTab = normalized.tabs[selectedTabIndex] ?? newTab(tabId);
  const selectedTabDetail = normalized.tabDetails[tabId] ?? newTabDetail(tabId);
  const safeNavIndex = clampIndex(navIndex, normalized.navItems.length);
  const selectedNavItem = normalized.navItems[safeNavIndex];
  const games = normalized[gameList];
  const safeGameIndex = clampIndex(gameIndex, games.length);
  const selectedGame = games[safeGameIndex];
  const rows = normalized[rowList];
  const safeRowIndex = clampIndex(rowIndex, rows.length);
  const selectedRow = rows[safeRowIndex];
  const safeSeasonStatIndex = clampIndex(seasonStatIndex, normalized.season.stats.length);
  const selectedSeasonStat = normalized.season.stats[safeSeasonStatIndex];

  const updateContent = (producer: (current: LeaderboardPageContentData) => LeaderboardPageContentData) => {
    onContentChange(previous => normalizeLeaderboardPageContent(producer(normalizeLeaderboardPageContent(previous))));
    setStatus('Unsaved leaderboard content changes');
  };

  const updateMode = (nextMode: Partial<LeaderboardModeContent>) => {
    updateContent(current => ({
      ...current,
      modes: {
        ...current.modes,
        [mode]: {
          ...current.modes[mode],
          ...nextMode,
        },
      },
    }));
  };

  const updateTab = (nextTab: Partial<LeaderboardTab>) => {
    updateContent(current => ({
      ...current,
      tabs: current.tabs.map((tab, index) => index === selectedTabIndex ? { ...tab, ...nextTab } : tab),
    }));
  };

  const updateTabDetail = (nextTabDetail: Partial<LeaderboardTabDetail>) => {
    updateContent(current => ({
      ...current,
      tabDetails: {
        ...current.tabDetails,
        [tabId]: {
          ...current.tabDetails[tabId],
          ...nextTabDetail,
        },
      },
    }));
  };

  const updateNavItems = (nextItems: LeaderboardNavItem[]) => {
    updateContent(current => ({ ...current, navItems: nextItems }));
  };

  const updateSelectedNavItem = (nextItem: Partial<LeaderboardNavItem>) => {
    updateNavItems(normalized.navItems.map((item, index) => index === safeNavIndex ? { ...item, ...nextItem } : item));
  };

  const updateGames = (nextGames: LeaderboardGameOption[] | LeaderboardQuickGame[]) => {
    if (gameList === 'topGames') {
      updateContent(current => ({ ...current, topGames: nextGames as LeaderboardGameOption[] }));
      return;
    }
    updateContent(current => ({ ...current, quickGames: nextGames as LeaderboardQuickGame[] }));
  };

  const updateSelectedTopGame = (nextGame: Partial<LeaderboardGameOption>) => {
    if (gameList !== 'topGames') return;
    updateContent(current => ({
      ...current,
      topGames: current.topGames.map((game, index) => index === safeGameIndex ? { ...game, ...nextGame } : game),
    }));
  };

  const updateSelectedQuickGame = (nextGame: Partial<LeaderboardQuickGame>) => {
    if (gameList !== 'quickGames') return;
    updateContent(current => ({
      ...current,
      quickGames: current.quickGames.map((game, index) => index === safeGameIndex ? { ...game, ...nextGame } : game),
    }));
  };

  const updateRows = (nextRows: LeaderboardContentRow[]) => {
    updateContent(current => ({ ...current, [rowList]: nextRows }));
  };

  const updateSeason = (nextSeason: Partial<LeaderboardSeason>) => {
    updateContent(current => ({ ...current, season: { ...current.season, ...nextSeason } }));
  };

  const updateSeasonStats = (nextStats: LeaderboardSeason['stats']) => {
    updateSeason({ stats: nextStats });
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      const result = await onSave(normalized);
      setStatus(typeof result === 'string' && result ? result : 'Leaderboard content saved');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const resetContent = () => {
    onContentChange(DEFAULT_LEADERBOARD_PAGE_CONTENT);
    setRawJson('');
    setStatus('Reset content to defaults');
  };

  const addGame = () => {
    const next = gameList === 'topGames'
      ? [...normalized.topGames, newTopGame(normalized.topGames.length)]
      : [...normalized.quickGames, newQuickGame()];
    updateGames(next);
    setGameIndex(next.length - 1);
  };

  const copyGame = () => {
    if (!selectedGame) return;
    const clone = {
      ...selectedGame,
      id: `${selectedGame.id}-copy-${Date.now()}`,
      name: `${selectedGame.name} Copy`,
    };
    const next = [...games.slice(0, safeGameIndex + 1), clone, ...games.slice(safeGameIndex + 1)] as typeof games;
    updateGames(next);
    setGameIndex(safeGameIndex + 1);
  };

  const removeGame = () => {
    const next = games.filter((_, index) => index !== safeGameIndex) as typeof games;
    updateGames(next);
    setGameIndex(clampIndex(safeGameIndex - 1, next.length));
  };

  const removeRow = () => {
    const next = rows.filter((_, index) => index !== safeRowIndex);
    updateRows(next);
    setRowIndex(clampIndex(safeRowIndex - 1, next.length));
  };

  const applyRawJson = () => {
    try {
      const next = normalizeLeaderboardPageContent(JSON.parse(rawJson || JSON.stringify(normalized)));
      onContentChange(next);
      setStatus('Applied JSON');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  return (
    <section style={shellStyle}>
      <div style={toolbarStyle}>
        {panelTabs.map(panel => (
          <button
            key={panel.id}
            type="button"
            style={tabButtonStyle(activePanel === panel.id)}
            aria-pressed={activePanel === panel.id}
            onClick={() => setActivePanel(panel.id)}
          >
            {panel.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button type="button" style={dangerButtonStyle} onClick={resetContent}>
          Reset Content
        </button>
        <button type="button" style={buttonStyle} disabled={isSaving} onClick={handleSave}>
          {isSaving ? 'Saving...' : 'Save Content'}
        </button>
      </div>

      {activePanel === 'overview' ? (
        <div style={cardStyle}>
          <div style={summaryGridStyle}>
            <button type="button" style={{ ...summaryCardStyle, color: '#e0fbff', textAlign: 'left', cursor: 'pointer' }} onClick={() => setActivePanel('modes')}>
              <span style={{ color: '#54e2ff', fontSize: '0.78rem', fontWeight: 950, textTransform: 'uppercase' }}>Modes</span>
              <strong style={{ fontSize: '1.15rem' }}>{pageModes.length} routes</strong>
              <span>Overall, per-game, and AI benchmark route copy.</span>
            </button>
            <button type="button" style={{ ...summaryCardStyle, color: '#e0fbff', textAlign: 'left', cursor: 'pointer' }} onClick={() => setActivePanel('tabsNav')}>
              <span style={{ color: '#ffd36a', fontSize: '0.78rem', fontWeight: 950, textTransform: 'uppercase' }}>Navigation</span>
              <strong style={{ fontSize: '1.15rem' }}>{normalized.tabs.length} tabs / {normalized.navItems.length} nav items</strong>
              <span>Left rail items, tab labels, and detail cards.</span>
            </button>
            <button type="button" style={{ ...summaryCardStyle, color: '#e0fbff', textAlign: 'left', cursor: 'pointer' }} onClick={() => setActivePanel('games')}>
              <span style={{ color: '#20e39d', fontSize: '0.78rem', fontWeight: 950, textTransform: 'uppercase' }}>Games</span>
              <strong style={{ fontSize: '1.15rem' }}>{normalized.topGames.length} top / {normalized.quickGames.length} quick</strong>
              <span>Top game showcase and bottom quick switches.</span>
            </button>
            <button type="button" style={{ ...summaryCardStyle, color: '#e0fbff', textAlign: 'left', cursor: 'pointer' }} onClick={() => setActivePanel('rows')}>
              <span style={{ color: '#bd76ff', fontSize: '0.78rem', fontWeight: 950, textTransform: 'uppercase' }}>Runtime Data</span>
              <strong style={{ fontSize: '1.15rem' }}>Cloudflare rows</strong>
              <span>Production rows are API-owned; editor preview data stays separate.</span>
            </button>
          </div>
        </div>
      ) : null}

      {activePanel === 'modes' ? (
        <div style={cardStyle}>
          <div style={toolbarStyle}>
            {pageModes.map(nextMode => (
              <button
                key={nextMode}
                type="button"
                style={tabButtonStyle(mode === nextMode)}
                aria-pressed={mode === nextMode}
                onClick={() => setMode(nextMode)}
              >
                {leaderboardModeLabel(nextMode)}
              </button>
            ))}
          </div>
          <div style={gridStyle}>
            <TextField label="Title" value={selectedMode.title} onChange={value => updateMode({ title: value })} />
            <TextField label="Route Label" value={selectedMode.routeLabel} onChange={value => updateMode({ routeLabel: value })} />
            <TextField label="Selected Game ID" value={selectedMode.selectedGameId ?? ''} onChange={value => updateMode({ selectedGameId: value || undefined })} />
            <SelectField label="Default Tab" value={selectedMode.defaultTab} options={tabIds} onChange={value => updateMode({ defaultTab: value })} />
            <SelectField label="Runtime Row Source" value={selectedMode.rowSource === 'api' ? selectedMode.rowSource : 'api'} options={rowSources} onChange={value => updateMode({ rowSource: value })} />
          </div>
          <div style={summaryCardStyle}>
            Leaderboard rows are loaded from Cloudflare at runtime. Layout assets can tune copy, tabs, games, season copy, and chrome, but they do not own production standings.
          </div>
        </div>
      ) : null}

      {activePanel === 'tabsNav' ? (
        <div style={wideGridStyle}>
          <div style={cardStyle}>
            <div style={toolbarStyle}>
              <strong>Tabs</strong>
              <span style={{ flex: 1 }} />
              {tabIds.filter(id => !normalized.tabs.some(tab => tab.id === id)).map(id => (
                <button key={id} type="button" style={buttonStyle} onClick={() => {
                  updateContent(current => ({
                    ...current,
                    tabs: [...current.tabs, newTab(id)],
                    tabDetails: { ...current.tabDetails, [id]: current.tabDetails[id] ?? newTabDetail(id) },
                  }));
                  setTabId(id);
                }}>+ {id}</button>
              ))}
            </div>
            <div style={listStyle}>
              {normalized.tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  style={listItemStyle(tab.id === tabId)}
                  onClick={() => setTabId(tab.id)}
                >
                  <span style={selectButtonStyle}>
                    <strong>{tab.label}</strong>
                    <span>{tab.title}</span>
                  </span>
                </button>
              ))}
            </div>
            <div style={gridStyle}>
              <SelectField label="Tab ID" value={selectedTab.id} options={tabIds} onChange={value => {
                setTabId(value);
                updateTab({ id: value });
              }} />
              <TextField label="Tab Label" value={selectedTab.label} onChange={value => updateTab({ label: value })} />
              <TextField label="Tab Title" value={selectedTab.title} onChange={value => updateTab({ title: value })} wide />
              <TextField label="Detail Eyebrow" value={selectedTabDetail.eyebrow} onChange={value => updateTabDetail({ eyebrow: value })} />
              <TextField label="Detail Title" value={selectedTabDetail.title} onChange={value => updateTabDetail({ title: value })} />
              <SelectField label="Tone" value={selectedTabDetail.tone} options={tones.map(tone => ({ value: tone, label: toneLabel(tone) }))} onChange={value => updateTabDetail({ tone: value })} />
              <TextAreaField label="Summary" value={selectedTabDetail.summary} onChange={value => updateTabDetail({ summary: value })} wide />
              <TextField label="Primary" value={selectedTabDetail.primary} onChange={value => updateTabDetail({ primary: value })} />
              <TextField label="Secondary" value={selectedTabDetail.secondary} onChange={value => updateTabDetail({ secondary: value })} />
              <TextField label="Action" value={selectedTabDetail.action} onChange={value => updateTabDetail({ action: value })} />
            </div>
          </div>
          <div style={cardStyle}>
            <div style={toolbarStyle}>
              <strong>Left Rail Items</strong>
              <span style={{ flex: 1 }} />
              <button type="button" style={buttonStyle} onClick={() => {
                const next = [...normalized.navItems, newNavItem(tabId)];
                updateNavItems(next);
                setNavIndex(next.length - 1);
              }}>+ Item</button>
            </div>
            <div style={listStyle}>
              {normalized.navItems.map((item, index) => (
                <div key={`${item.label}-${index}`} style={listItemStyle(index === safeNavIndex)}>
                  <button type="button" style={selectButtonStyle} onClick={() => setNavIndex(index)}>
                    <strong>{index + 1}. {item.label}</strong>
                    <span>{item.detail}</span>
                  </button>
                  <span style={listActionBarStyle}>
                    <button type="button" style={buttonStyle} onClick={() => {
                      updateNavItems(reorder(normalized.navItems, index, -1));
                      setNavIndex(clampIndex(index - 1, normalized.navItems.length));
                    }}>Up</button>
                    <button type="button" style={buttonStyle} onClick={() => {
                      updateNavItems(reorder(normalized.navItems, index, 1));
                      setNavIndex(clampIndex(index + 1, normalized.navItems.length));
                    }}>Down</button>
                    <button type="button" style={dangerButtonStyle} onClick={() => {
                      const next = normalized.navItems.filter((_, itemIndex) => itemIndex !== index);
                      updateNavItems(next);
                      setNavIndex(clampIndex(index - 1, next.length));
                    }}>X</button>
                  </span>
                </div>
              ))}
            </div>
            {selectedNavItem ? (
              <div style={gridStyle}>
                <TextField label="Label" value={selectedNavItem.label} onChange={value => updateSelectedNavItem({ label: value })} />
                <TextField label="Detail" value={selectedNavItem.detail} onChange={value => updateSelectedNavItem({ detail: value })} />
                <SelectField label="Icon" value={selectedNavItem.icon} options={iconNames} onChange={value => updateSelectedNavItem({ icon: value })} />
                <SelectField label="Tab" value={selectedNavItem.tabId} options={tabIds} onChange={value => updateSelectedNavItem({ tabId: value })} />
                <SelectField label="Tone" value={selectedNavItem.tone ?? 'cyan'} options={tones.map(tone => ({ value: tone, label: toneLabel(tone) }))} onChange={value => updateSelectedNavItem({ tone: value })} />
              </div>
            ) : <div style={summaryCardStyle}>No nav item selected.</div>}
          </div>
        </div>
      ) : null}

      {activePanel === 'games' ? (
        <div style={wideGridStyle}>
          <div style={cardStyle}>
            <div style={toolbarStyle}>
              <SelectField label="Game List" value={gameList} options={[
                { value: 'topGames', label: 'Top Games' },
                { value: 'quickGames', label: 'Quick Games' },
              ]} onChange={value => {
                setGameList(value);
                setGameIndex(0);
              }} />
              <span style={{ flex: 1 }} />
              <button type="button" style={buttonStyle} onClick={addGame}>+ Game</button>
              <button type="button" style={buttonStyle} disabled={!selectedGame} onClick={copyGame}>Copy</button>
            </div>
            <div style={listStyle}>
              {games.map((game, index) => (
                <div key={`${game.id}-${index}`} style={listItemStyle(index === safeGameIndex)}>
                  <button type="button" style={selectButtonStyle} onClick={() => setGameIndex(index)}>
                    <strong>{index + 1}. {game.name}</strong>
                    <span>{gameList === 'topGames' ? `${(game as LeaderboardGameOption).matches} / ${(game as LeaderboardGameOption).growth}` : (game as LeaderboardQuickGame).detail}</span>
                  </button>
                  <span style={listActionBarStyle}>
                    <button type="button" style={buttonStyle} onClick={() => {
                      updateGames(gameList === 'topGames'
                        ? reorder(normalized.topGames, index, -1)
                        : reorder(normalized.quickGames, index, -1));
                      setGameIndex(clampIndex(index - 1, games.length));
                    }}>Up</button>
                    <button type="button" style={buttonStyle} onClick={() => {
                      updateGames(gameList === 'topGames'
                        ? reorder(normalized.topGames, index, 1)
                        : reorder(normalized.quickGames, index, 1));
                      setGameIndex(clampIndex(index + 1, games.length));
                    }}>Down</button>
                    <button type="button" style={dangerButtonStyle} onClick={removeGame}>X</button>
                  </span>
                </div>
              ))}
              {games.length === 0 ? <div style={summaryCardStyle}>No games authored.</div> : null}
            </div>
          </div>
          <div style={cardStyle}>
            {selectedGame && gameList === 'topGames' ? (
              <div style={gridStyle}>
                <TextField label="ID" value={(selectedGame as LeaderboardGameOption).id} onChange={value => updateSelectedTopGame({ id: value })} />
                <NumberField label="Rank" value={(selectedGame as LeaderboardGameOption).rank} onChange={value => updateSelectedTopGame({ rank: value ?? 1 })} />
                <TextField label="Name" value={(selectedGame as LeaderboardGameOption).name} onChange={value => updateSelectedTopGame({ name: value })} />
                <TextField label="Matches" value={(selectedGame as LeaderboardGameOption).matches} onChange={value => updateSelectedTopGame({ matches: value })} />
                <TextField label="Growth" value={(selectedGame as LeaderboardGameOption).growth} onChange={value => updateSelectedTopGame({ growth: value })} />
                <SelectField label="Tone" value={(selectedGame as LeaderboardGameOption).tone} options={tones.map(tone => ({ value: tone, label: toneLabel(tone) }))} onChange={value => updateSelectedTopGame({ tone: value })} />
                <TextField label="Category" value={(selectedGame as LeaderboardGameOption).category ?? ''} onChange={value => updateSelectedTopGame({ category: value || undefined })} />
                <TextField label="Subcategory" value={(selectedGame as LeaderboardGameOption).subcategory ?? ''} onChange={value => updateSelectedTopGame({ subcategory: value || null })} />
                <NumberField label="Game Type" value={(selectedGame as LeaderboardGameOption).gameType} onChange={value => updateSelectedTopGame({ gameType: value })} />
                <TextField label="Route Path" value={(selectedGame as LeaderboardGameOption).routePath ?? ''} onChange={value => updateSelectedTopGame({ routePath: value || undefined })} />
              </div>
            ) : selectedGame ? (
              <div style={gridStyle}>
                <TextField label="ID" value={(selectedGame as LeaderboardQuickGame).id} onChange={value => updateSelectedQuickGame({ id: value })} />
                <TextField label="Name" value={(selectedGame as LeaderboardQuickGame).name} onChange={value => updateSelectedQuickGame({ name: value })} />
                <TextField label="Detail" value={(selectedGame as LeaderboardQuickGame).detail} onChange={value => updateSelectedQuickGame({ detail: value })} />
                <SelectField label="Icon" value={(selectedGame as LeaderboardQuickGame).icon} options={iconNames} onChange={value => updateSelectedQuickGame({ icon: value })} />
                <SelectField label="Tone" value={(selectedGame as LeaderboardQuickGame).tone} options={tones.map(tone => ({ value: tone, label: toneLabel(tone) }))} onChange={value => updateSelectedQuickGame({ tone: value })} />
                <TextField label="Category" value={(selectedGame as LeaderboardQuickGame).category ?? ''} onChange={value => updateSelectedQuickGame({ category: value || undefined })} />
                <TextField label="Subcategory" value={(selectedGame as LeaderboardQuickGame).subcategory ?? ''} onChange={value => updateSelectedQuickGame({ subcategory: value || null })} />
                <NumberField label="Game Type" value={(selectedGame as LeaderboardQuickGame).gameType} onChange={value => updateSelectedQuickGame({ gameType: value })} />
                <TextField label="Route Path" value={(selectedGame as LeaderboardQuickGame).routePath ?? ''} onChange={value => updateSelectedQuickGame({ routePath: value || undefined })} />
              </div>
            ) : (
              <div style={summaryCardStyle}>Select or add a game.</div>
            )}
          </div>
        </div>
      ) : null}

      {activePanel === 'rows' ? (
        <div style={wideGridStyle}>
          <div style={cardStyle}>
            <div style={summaryCardStyle}>
              <strong>Runtime contract</strong>
              <span>Production standings come from Cloudflare leaderboard APIs. The main app ignores saved fallback and AI row arrays so old layout assets cannot publish fake leaders.</span>
              <span>Use this section only to inspect or clear legacy row fields from older assets.</span>
            </div>
            <div style={toolbarStyle}>
              <SelectField label="Rows" value={rowList} options={[
                { value: 'fallbackRows', label: 'Legacy Player Rows' },
                { value: 'aiBenchmarkRows', label: 'Legacy AI Rows' },
              ]} onChange={value => {
                setRowList(value);
                setRowIndex(0);
              }} />
              <span style={{ flex: 1 }} />
              <button type="button" style={dangerButtonStyle} onClick={() => {
                updateRows([]);
                setRowIndex(0);
              }}>Clear Legacy Rows</button>
            </div>
            <div style={listStyle}>
              {rows.map((row, index) => (
                <div key={`${row.user_id}-${index}`} style={listItemStyle(index === safeRowIndex)}>
                  <button type="button" style={selectButtonStyle} onClick={() => setRowIndex(index)}>
                    <strong>#{row.rank} {row.user_id}</strong>
                    <span>{row.score.toLocaleString()} rating / {row.bestGame ?? 'No game'}</span>
                  </button>
                  <span style={listActionBarStyle}>
                    <button type="button" style={buttonStyle} onClick={() => {
                      updateRows(reorder(rows, index, -1));
                      setRowIndex(clampIndex(index - 1, rows.length));
                    }}>Up</button>
                    <button type="button" style={buttonStyle} onClick={() => {
                      updateRows(reorder(rows, index, 1));
                      setRowIndex(clampIndex(index + 1, rows.length));
                    }}>Down</button>
                    <button type="button" style={dangerButtonStyle} onClick={removeRow}>X</button>
                  </span>
                </div>
              ))}
            </div>
            <TextAreaField
              label="Distribution Labels"
              value={linesText(normalized.distributionLabels)}
              onChange={value => updateContent(current => ({ ...current, distributionLabels: linesFromText(value) }))}
              wide
            />
          </div>
          <div style={cardStyle}>
            {selectedRow ? (
              <div style={summaryCardStyle}>
                <strong>#{selectedRow.rank} {selectedRow.user_id}</strong>
                <span>Score: {selectedRow.score.toLocaleString()}</span>
                <span>Wins/losses: {selectedRow.wins ?? 0}/{selectedRow.losses ?? 0}</span>
                <span>Best game: {selectedRow.bestGame ?? 'N/A'}</span>
                <span>Trend: {selectedRow.trend ?? '-'}</span>
                <span>Tone: {toneLabel(selectedRow.tone ?? 'cyan')}</span>
              </div>
            ) : (
              <div style={summaryCardStyle}>No legacy row selected.</div>
            )}
          </div>
        </div>
      ) : null}

      {activePanel === 'seasonCopy' ? (
        <div style={wideGridStyle}>
          <div style={cardStyle}>
            <strong>Season</strong>
            <div style={gridStyle}>
              <TextField label="Label" value={normalized.season.label} onChange={value => updateSeason({ label: value })} />
              <TextField label="Title" value={normalized.season.title} onChange={value => updateSeason({ title: value })} />
              <TextField label="Date Range" value={normalized.season.dateRange} onChange={value => updateSeason({ dateRange: value })} />
              <TextField label="Action Label" value={normalized.season.actionLabel} onChange={value => updateSeason({ actionLabel: value })} />
              <TextField label="Detail Title" value={normalized.season.detailTitle} onChange={value => updateSeason({ detailTitle: value })} />
              <TextField label="Detail Subtitle" value={normalized.season.detailSubtitle} onChange={value => updateSeason({ detailSubtitle: value })} />
            </div>
            <div style={toolbarStyle}>
              <strong>Season Stats</strong>
              <span style={{ flex: 1 }} />
              <button type="button" style={buttonStyle} onClick={() => {
                const next = [...normalized.season.stats, newSeasonStat()];
                updateSeasonStats(next);
                setSeasonStatIndex(next.length - 1);
              }}>+ Stat</button>
            </div>
            <div style={listStyle}>
              {normalized.season.stats.map((stat, index) => (
                <div key={`${stat.label}-${index}`} style={listItemStyle(index === safeSeasonStatIndex)}>
                  <button type="button" style={selectButtonStyle} onClick={() => setSeasonStatIndex(index)}>
                    <strong>{stat.label}</strong>
                    <span>{stat.value}</span>
                  </button>
                  <span style={listActionBarStyle}>
                    <button type="button" style={dangerButtonStyle} onClick={() => {
                      const next = normalized.season.stats.filter((_, statIndex) => statIndex !== index);
                      updateSeasonStats(next);
                      setSeasonStatIndex(clampIndex(index - 1, next.length));
                    }}>X</button>
                  </span>
                </div>
              ))}
            </div>
            {selectedSeasonStat ? (
              <div style={gridStyle}>
                <TextField label="Stat Label" value={selectedSeasonStat.label} onChange={value => updateSeasonStats(normalized.season.stats.map((stat, index) => index === safeSeasonStatIndex ? { ...stat, label: value } : stat))} />
                <TextField label="Stat Value" value={selectedSeasonStat.value} onChange={value => updateSeasonStats(normalized.season.stats.map((stat, index) => index === safeSeasonStatIndex ? { ...stat, value } : stat))} />
              </div>
            ) : null}
          </div>
          <div style={cardStyle}>
            <strong>Copy</strong>
            <div style={gridStyle}>
              {Object.entries(normalized.metricLabels).map(([key, value]) => (
                <TextField key={key} label={`Metric ${key}`} value={value} onChange={nextValue => updateContent(current => ({
                  ...current,
                  metricLabels: { ...current.metricLabels, [key]: nextValue },
                }))} />
              ))}
              {Object.entries(normalized.uiCopy)
                .filter(([, value]) => typeof value === 'string')
                .map(([key, value]) => (
                  <TextField key={key} label={`UI ${key}`} value={value as string} onChange={nextValue => updateContent(current => ({
                    ...current,
                    uiCopy: { ...current.uiCopy, [key]: nextValue },
                  }))} />
                ))}
              <TextAreaField
                label="Detail Snapshot Lines"
                value={linesText(normalized.uiCopy.detailSnapshotLines)}
                onChange={value => updateContent(current => ({
                  ...current,
                  uiCopy: { ...current.uiCopy, detailSnapshotLines: linesFromText(value) },
                }))}
                wide
              />
            </div>
          </div>
        </div>
      ) : null}

      {activePanel === 'rawJson' ? (
        <div style={cardStyle}>
          <TextAreaField
            label="Leaderboard content JSON"
            value={rawJson || JSON.stringify(normalized, null, 2)}
            wide
            minHeight="22rem"
            onChange={setRawJson}
          />
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => setRawJson(JSON.stringify(normalized, null, 2))}>Refresh From Form</button>
            <button type="button" style={buttonStyle} onClick={applyRawJson}>Apply JSON</button>
            <button type="button" style={dangerButtonStyle} onClick={resetContent}>Reset Defaults</button>
          </div>
        </div>
      ) : null}

      {status ? <p style={{ color: '#bcecff', margin: 0 }}>{status}</p> : null}
    </section>
  );
}
