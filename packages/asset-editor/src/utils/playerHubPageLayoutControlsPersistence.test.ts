import { beforeEach, describe, expect, it, vi } from 'vitest';

const assetAdapterMocks = vi.hoisted(() => ({
  readAsset: vi.fn(),
  writeAsset: vi.fn(),
}));

vi.mock('@/adapters/assets/TauriAssetAdapter', () => ({
  readAsset: assetAdapterMocks.readAsset,
  writeAsset: assetAdapterMocks.writeAsset,
}));

const decoder = new TextDecoder();

function createPageAsset(playerHubControls: unknown = {}, playerHubContent?: unknown) {
  return {
    system: {
      guid: 'player-hub-page-layout',
      assetType: 'PageLayout',
      schemaVersion: 1,
      displayName: 'Player Hub Page Layout',
      category: 'UI',
      treePath: 'Resources/Pages/PlayerHubPageLayout.asset',
    },
    data: {
      pageId: 'player-hub',
      routePath: '/player-hub',
      title: 'Player Hub',
      kind: 'player-hub',
      slices: [],
      layout: {
        type: 'custom',
        sections: [],
      },
      playerHubControls,
      ...(playerHubContent ? { playerHubContent } : {}),
    },
  };
}

describe('playerHubPageLayoutControlsPersistence', () => {
  beforeEach(() => {
    assetAdapterMocks.readAsset.mockReset();
    assetAdapterMocks.writeAsset.mockReset();
    assetAdapterMocks.writeAsset.mockResolvedValue(undefined);
  });

  it('loads player hub controls from the page layout asset', async () => {
    const { loadPlayerHubPageLayoutControlsFromDisk } = await import('@/utils/playerHubPageLayoutControlsPersistence');
    assetAdapterMocks.readAsset.mockResolvedValue(
      new Response(JSON.stringify(createPageAsset({
        header: {
          title: 'Test Hub',
          statusLabel: 'Private',
        },
        defaultTab: 'matches',
      })), { status: 200 }),
    );

    const result = await loadPlayerHubPageLayoutControlsFromDisk();

    expect(result.controls.header.title).toBe('Test Hub');
    expect(result.controls.header.statusLabel).toBe('Private');
    expect(result.controls.defaultTab).toBe('matches');
    expect(result.content.uiCopy.header.title).toBe('Player Hub');
    expect(result.content.headerMetrics[0]?.label).toBe('GP');
  });

  it('saves normalized player hub controls to the page layout asset', async () => {
    const { savePlayerHubPageLayoutControlsToDisk } = await import('@/utils/playerHubPageLayoutControlsPersistence');
    assetAdapterMocks.readAsset.mockResolvedValue(
      new Response(JSON.stringify(createPageAsset()), { status: 200 }),
    );

    await savePlayerHubPageLayoutControlsToDisk({
      header: {
        title: 'Player Command',
        subtitle: 'Hidden copy',
        statusLabel: 'Account',
        showSubtitle: false,
      },
      tabs: [
        { id: 'overview', label: 'Overview', enabled: true },
        { id: 'matches', label: 'Matches', enabled: true },
        { id: 'learning', label: 'Learning', enabled: false },
        { id: 'competition', label: 'Competition', enabled: true },
        { id: 'inventory', label: 'Inventory', enabled: true },
        { id: 'rewards', label: 'Rewards', enabled: true },
        { id: 'account', label: 'Account', enabled: true },
      ],
      quickActions: [
        { id: 'play', label: 'Play', enabled: true },
        { id: 'lobby', label: 'Lobby', enabled: true },
        { id: 'shop', label: 'Shop', enabled: true },
        { id: 'settings', label: 'Settings', enabled: true },
      ],
      defaultTab: 'overview',
      emptyStates: {
        overview: { title: 'Overview empty', body: 'Overview body', actionLabel: 'Open Lobby' },
        matches: { title: 'Matches empty', body: 'Matches body', actionLabel: 'Open Lobby' },
        learning: { title: 'Learning empty', body: 'Learning body', actionLabel: 'Browse Games' },
        competition: { title: 'Competition empty', body: 'Competition body', actionLabel: 'Open Competition' },
        inventory: { title: 'Inventory empty', body: 'Inventory body', actionLabel: 'Open Shop' },
        rewards: { title: 'Rewards empty', body: 'Rewards body', actionLabel: 'Open Shop' },
        account: { title: 'Account empty', body: 'Account body', actionLabel: 'Open Settings' },
        ai: { title: 'AI empty', body: 'AI body', actionLabel: 'Open AI Setup' },
      },
      labels: {
        sidePanelTitle: 'Player',
        statsTitle: 'Snapshot',
        nextActionTitle: 'Actions',
        mainKicker: 'Private',
        accountStatusLabel: 'Signed in',
      },
    });

    expect(assetAdapterMocks.writeAsset).toHaveBeenCalledTimes(1);
    const [assetPath, payload] = assetAdapterMocks.writeAsset.mock.calls[0];
    expect(assetPath).toBe('Resources/Pages/PlayerHubPageLayout.asset');
    const pagePayload = JSON.parse(decoder.decode(payload as Uint8Array));
    expect(pagePayload.data.playerHubControls.header.title).toBe('Player Command');
    expect(pagePayload.data.playerHubControls.tabs.find((tab: { id: string }) => tab.id === 'learning')?.enabled).toBe(false);
    expect(pagePayload.data.playerHubContent.uiCopy.header.title).toBe('Player Hub');
    expect(pagePayload.data.playerHubContent.headerMetrics[0].label).toBe('GP');
    expect(pagePayload.data.playerHubContent.navigation[0].title).toBe('Overview');
    expect(pagePayload.data.playerHubContent.navigation.some((item: { id: string }) => item.id === 'account')).toBe(true);
    expect(pagePayload.data.playerHubContent.previews.some((row: { sectionId: string }) => row.sectionId === 'account')).toBe(true);
    expect(pagePayload.data.playerHubContent.rightTabs.some((tab: { id: string }) => tab.id === 'settings')).toBe(true);
    expect(pagePayload.data.playerHubContent.sections.account.summaryCards.length).toBeGreaterThan(0);
    expect(pagePayload.data.playerHubContent.sections.overview.summaryCards.find((card: { id: string }) => card.id === 'settings-privacy')?.targetDetail).toBe('settings');
    expect(pagePayload.data.playerHubContent.sections.overview.summaryCards.find((card: { id: string }) => card.id === 'balances-ownership')?.targetDetail).toBe('balances');
  });

  it('saves explicitly authored player hub content without falling back to shop content', async () => {
    const { savePlayerHubPageLayoutControlsToDisk } = await import('@/utils/playerHubPageLayoutControlsPersistence');
    const { normalizePlayerHubPageContent } = await import('@ocentra/core-ui/AppPages/PlayerHub/PlayerHubPageSvgContent');
    assetAdapterMocks.readAsset.mockResolvedValue(
      new Response(JSON.stringify(createPageAsset()), { status: 200 }),
    );
    const authoredContent = normalizePlayerHubPageContent({
      headerMetrics: [{ key: 'gp', label: 'Custom Metric', fallbackValue: 'N/A' }],
    });

    await savePlayerHubPageLayoutControlsToDisk(
      {
        header: {
          title: 'Player Hub',
          subtitle: 'Private hub',
          statusLabel: 'Account',
          showSubtitle: false,
        },
        tabs: [
          { id: 'overview', label: 'Overview', enabled: true },
          { id: 'matches', label: 'Matches', enabled: true },
          { id: 'learning', label: 'Learning', enabled: true },
          { id: 'competition', label: 'Competition', enabled: true },
          { id: 'inventory', label: 'Inventory', enabled: true },
          { id: 'rewards', label: 'Rewards', enabled: true },
          { id: 'account', label: 'Account', enabled: true },
        ],
        quickActions: [
          { id: 'play', label: 'Play', enabled: true },
          { id: 'lobby', label: 'Lobby', enabled: true },
          { id: 'shop', label: 'Shop', enabled: true },
          { id: 'settings', label: 'Settings', enabled: true },
        ],
        defaultTab: 'overview',
        emptyStates: {
          overview: { title: 'Overview empty', body: 'Overview body', actionLabel: 'Open Lobby' },
          matches: { title: 'Matches empty', body: 'Matches body', actionLabel: 'Open Lobby' },
          learning: { title: 'Learning empty', body: 'Learning body', actionLabel: 'Browse Games' },
          competition: { title: 'Competition empty', body: 'Competition body', actionLabel: 'Open Competition' },
          inventory: { title: 'Inventory empty', body: 'Inventory body', actionLabel: 'Open Shop' },
          rewards: { title: 'Rewards empty', body: 'Rewards body', actionLabel: 'Open Shop' },
          account: { title: 'Account empty', body: 'Account body', actionLabel: 'Open Settings' },
          ai: { title: 'AI empty', body: 'AI body', actionLabel: 'Open AI Setup' },
        },
        labels: {
          sidePanelTitle: 'Player',
          statsTitle: 'Snapshot',
          nextActionTitle: 'Actions',
          mainKicker: 'Private',
          accountStatusLabel: 'Signed in',
        },
      },
      authoredContent,
    );

    const [, payload] = assetAdapterMocks.writeAsset.mock.calls[0];
    const pagePayload = JSON.parse(decoder.decode(payload as Uint8Array));
    expect(pagePayload.data.playerHubContent.headerMetrics[0].label).toBe('Custom Metric');
    expect(pagePayload.data.playerHubContent.navigation[0].title).toBe('Overview');
    expect(pagePayload.data.playerHubContent.navigation[0].title).not.toBe('Treasury');
    expect(pagePayload.data.playerHubContent.rightDetails.settings[0].label).toBe('Theme');
  });

  it('rejects shop-shaped content in playerHubContent', async () => {
    const { normalizePlayerHubPageContent } = await import('@ocentra/core-ui/AppPages/PlayerHub/PlayerHubPageSvgContent');

    expect(() => normalizePlayerHubPageContent({
      creditPacks: [],
      sections: {
        Treasury: {
          title: 'Shop Section',
        },
      },
    } as never)).toThrow(/Unknown Player Hub content field/);
  });
});
