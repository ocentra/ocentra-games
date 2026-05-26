export type PlayerHubTabId =
  | 'overview'
  | 'matches'
  | 'learning'
  | 'ai'
  | 'competition'
  | 'inventory'
  | 'rewards'
  | 'account';

export type PlayerHubQuickActionId = 'play' | 'lobby' | 'shop' | 'settings';

export type PlayerHubTabControl = {
  id: PlayerHubTabId;
  label: string;
  enabled: boolean;
};

export type PlayerHubQuickActionControl = {
  id: PlayerHubQuickActionId;
  label: string;
  enabled: boolean;
};

export type PlayerHubEmptyStateCopy = {
  title: string;
  body: string;
  actionLabel?: string;
};

export type PlayerHubPageSvgControls = {
  header: {
    title: string;
    subtitle: string;
    statusLabel: string;
    showSubtitle: boolean;
  };
  tabs: PlayerHubTabControl[];
  quickActions: PlayerHubQuickActionControl[];
  defaultTab: PlayerHubTabId;
  emptyStates: Record<PlayerHubTabId, PlayerHubEmptyStateCopy>;
  labels: {
    sidePanelTitle: string;
    statsTitle: string;
    nextActionTitle: string;
    mainKicker: string;
    accountStatusLabel: string;
  };
};

export const PLAYER_HUB_TAB_ORDER: PlayerHubTabId[] = [
  'overview',
  'matches',
  'learning',
  'ai',
  'competition',
  'inventory',
  'rewards',
  'account',
];

export const PLAYER_HUB_QUICK_ACTION_ORDER: PlayerHubQuickActionId[] = [
  'play',
  'lobby',
  'shop',
  'settings',
];

export const DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS: PlayerHubPageSvgControls = {
  header: {
    title: 'Player Hub',
    subtitle: 'Your private player profile, settings, progress, matches, inventory, rewards, and account controls.',
    statusLabel: 'Account hub',
    showSubtitle: false,
  },
  tabs: [
    { id: 'overview', label: 'Overview', enabled: true },
    { id: 'matches', label: 'Matches', enabled: true },
    { id: 'learning', label: 'Learning', enabled: true },
    { id: 'ai', label: 'AI Setup', enabled: true },
    { id: 'competition', label: 'Competition', enabled: true },
    { id: 'inventory', label: 'Inventory', enabled: true },
    { id: 'rewards', label: 'Rewards', enabled: true },
    { id: 'account', label: 'Account', enabled: true },
  ],
  quickActions: [
    { id: 'play', label: 'Play', enabled: true },
    { id: 'lobby', label: 'Matches', enabled: true },
    { id: 'shop', label: 'Shop', enabled: true },
    { id: 'settings', label: 'Account', enabled: true },
  ],
  defaultTab: 'overview',
  emptyStates: {
    overview: {
      title: 'Your player activity will build here',
      body: 'Profile, preferences, balances, matches, lessons, inventory, rewards, and competition ownership fill from real account data.',
      actionLabel: 'View Details',
    },
    matches: {
      title: 'No completed matches yet',
      body: 'Finished matches and private table records will appear here after real match history is connected.',
      actionLabel: 'View History',
    },
    learning: {
      title: 'Learning paths are not active yet',
      body: 'Lessons, AI review, mistake tracking, and recommended drills will appear here when learning programs are enabled.',
      actionLabel: 'Browse Games',
    },
    ai: {
      title: 'AI setup is ready to configure',
      body: 'Cloud keys, local endpoints, browser models, and inference defaults are managed from Player Hub.',
      actionLabel: 'Open AI Setup',
    },
    competition: {
      title: 'No event tickets or tournament passes yet',
      body: 'Official event entries, check-in windows, tournament passes, and past competition records will appear here.',
      actionLabel: 'Open Competition',
    },
    inventory: {
      title: 'No owned items yet',
      body: 'Decks, cosmetics, badges, tickets, and passes you own will appear here after they are earned or granted.',
      actionLabel: 'Open Shop',
    },
    rewards: {
      title: 'No reward history yet',
      body: 'Daily rewards, badges, achievements, and competition prizes will appear here when they are earned.',
      actionLabel: 'Open Shop',
    },
    account: {
      title: 'Account controls live here',
      body: 'Profile preferences, notification settings, wallet status, AI settings, API settings, local runtime choices, and privacy controls belong inside Player Hub.',
      actionLabel: 'Manage Account',
    },
  },
  labels: {
    sidePanelTitle: 'Player',
    statsTitle: 'Account Snapshot',
    nextActionTitle: 'Next Action',
    mainKicker: 'Private Hub',
    accountStatusLabel: 'Signed-in player',
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function isPlayerHubTabId(value: unknown): value is PlayerHubTabId {
  return typeof value === 'string' && PLAYER_HUB_TAB_ORDER.includes(value as PlayerHubTabId);
}

function isPlayerHubQuickActionId(value: unknown): value is PlayerHubQuickActionId {
  return typeof value === 'string' && PLAYER_HUB_QUICK_ACTION_ORDER.includes(value as PlayerHubQuickActionId);
}

function normalizeTabs(value: unknown): PlayerHubTabControl[] {
  const source = Array.isArray(value) ? value : [];
  const byId = new Map(source.map(item => {
    const record = asRecord(item);
    return [record.id, record];
  }));
  return DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.tabs.map(defaultTab => {
    const record = asRecord(byId.get(defaultTab.id));
    return {
      id: defaultTab.id,
      label: readString(record.label, defaultTab.label),
      enabled: readBoolean(record.enabled, defaultTab.enabled),
    };
  });
}

function normalizeQuickActions(value: unknown): PlayerHubQuickActionControl[] {
  const source = Array.isArray(value) ? value : [];
  const byId = new Map(source.map(item => {
    const record = asRecord(item);
    return [record.id, record];
  }));
  return DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.quickActions.map(defaultAction => {
    const record = asRecord(byId.get(defaultAction.id));
    return {
      id: defaultAction.id,
      label: readString(record.label, defaultAction.label),
      enabled: readBoolean(record.enabled, defaultAction.enabled),
    };
  });
}

function normalizeEmptyStates(value: unknown): Record<PlayerHubTabId, PlayerHubEmptyStateCopy> {
  const record = asRecord(value);
  return PLAYER_HUB_TAB_ORDER.reduce((next, tabId) => {
    const defaultCopy = DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.emptyStates[tabId];
    const copy = asRecord(record[tabId]);
    next[tabId] = {
      title: readString(copy.title, defaultCopy.title),
      body: readString(copy.body, defaultCopy.body),
      actionLabel: readString(copy.actionLabel, defaultCopy.actionLabel ?? ''),
    };
    if (!next[tabId].actionLabel) {
      delete next[tabId].actionLabel;
    }
    return next;
  }, {} as Record<PlayerHubTabId, PlayerHubEmptyStateCopy>);
}

export function normalizePlayerHubPageSvgControls(value: unknown): PlayerHubPageSvgControls {
  const record = asRecord(value);
  const header = asRecord(record.header);
  const labels = asRecord(record.labels);
  const tabs = normalizeTabs(record.tabs);
  const fallbackDefaultTab = isPlayerHubTabId(record.defaultTab)
    ? record.defaultTab
    : DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.defaultTab;
  const defaultTab = tabs.some(tab => tab.id === fallbackDefaultTab && tab.enabled)
    ? fallbackDefaultTab
    : tabs.find(tab => tab.enabled)?.id ?? 'overview';

  return {
    header: {
      title: readString(header.title, DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.header.title),
      subtitle: readString(header.subtitle, DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.header.subtitle),
      statusLabel: readString(header.statusLabel, DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.header.statusLabel),
      showSubtitle: readBoolean(header.showSubtitle, DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.header.showSubtitle),
    },
    tabs,
    quickActions: normalizeQuickActions(record.quickActions).filter(action => isPlayerHubQuickActionId(action.id)),
    defaultTab,
    emptyStates: normalizeEmptyStates(record.emptyStates),
    labels: {
      sidePanelTitle: readString(labels.sidePanelTitle, DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.labels.sidePanelTitle),
      statsTitle: readString(labels.statsTitle, DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.labels.statsTitle),
      nextActionTitle: readString(labels.nextActionTitle, DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.labels.nextActionTitle),
      mainKicker: readString(labels.mainKicker, DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.labels.mainKicker),
      accountStatusLabel: readString(labels.accountStatusLabel, DEFAULT_PLAYER_HUB_PAGE_SVG_CONTROLS.labels.accountStatusLabel),
    },
  };
}
