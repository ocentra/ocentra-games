import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import type { CompetitionProgram } from '@ocentra/endpoint-domain/schemas/competition';

const assetAdapterMocks = vi.hoisted(() => ({
  readAsset: vi.fn(),
  writeAsset: vi.fn(),
}));

vi.mock('@/adapters/assets/TauriAssetAdapter', () => ({
  readAsset: assetAdapterMocks.readAsset,
  writeAsset: assetAdapterMocks.writeAsset,
}));

const decoder = new TextDecoder();

const sampleProgram: CompetitionProgram = {
  programId: 'claim-cup-test',
  programType: 'tournament',
  title: 'Claim Cup Test',
  subtitle: 'Internal tournament authoring test.',
  description: 'A test tournament used to verify page asset program persistence.',
  status: 'draft',
  featured: true,
  gameIds: ['claim'],
  tags: ['test'],
  region: 'Global',
  lifecycle: {
    startsAt: '2026-06-01T20:00:00.000Z',
    registrationOpensAt: '2026-05-25T20:00:00.000Z',
    registrationClosesAt: '2026-06-01T19:00:00.000Z',
    checkInOpensAt: '2026-06-01T19:30:00.000Z',
    checkInClosesAt: '2026-06-01T20:05:00.000Z',
  },
  entry: {
    mode: 'free',
    requirementLabel: 'Registration required',
  },
  rewards: [
    {
      title: 'Winner badge',
      detail: 'Awarded to the final winner.',
      place: 1,
    },
  ],
  stats: {
    registered: 0,
    capacity: 64,
    liveRooms: 0,
    prizePoolLabel: 'Beta badge',
  },
  routes: {
    lobbyPath: '/games/claim/lobby',
    shopPath: '/shop',
  },
  tournament: {
    format: 'single_elimination',
    teamSize: 1,
    capacity: 64,
    seedMethod: 'rating',
    stages: [],
    bracket: [],
  },
};

function createPageAsset(competitionPrograms: unknown = {
  programs: [],
  source: 'asset',
  generatedAt: '2026-05-24T00:00:00.000Z',
}) {
  return {
    system: {
      guid: 'competition-page-layout',
      assetType: 'PageLayout',
      schemaVersion: 1,
      displayName: 'Competition Page Layout',
      category: 'UI',
      treePath: 'Resources/Pages/CompetitionPageLayout.asset',
    },
    data: {
      pageId: 'competition',
      routePath: '/competition',
      title: 'Competition',
      kind: 'competition',
      slices: [],
      layout: {
        type: 'custom',
        sections: [],
      },
      shopControls: {},
      shopContent: {
        headerStats: [],
      },
      competitionPrograms,
    },
  };
}

describe('competitionPageLayoutControlsPersistence', () => {
  beforeEach(() => {
    assetAdapterMocks.readAsset.mockReset();
    assetAdapterMocks.writeAsset.mockReset();
    assetAdapterMocks.writeAsset.mockResolvedValue(undefined);
  });

  it('loads competition programs from the Competition page layout asset', async () => {
    const { loadCompetitionPageLayoutControlsFromDisk } = await import('@/utils/competitionPageLayoutControlsPersistence');
    assetAdapterMocks.readAsset.mockResolvedValue(
      new Response(JSON.stringify(createPageAsset({
        programs: [sampleProgram],
        featuredProgramId: sampleProgram.programId,
        source: 'asset',
        generatedAt: '2026-05-24T00:00:00.000Z',
      })), { status: 200 }),
    );

    const result = await loadCompetitionPageLayoutControlsFromDisk();

    expect(result.programs.programs).toHaveLength(1);
    expect(result.programs.programs[0]?.programId).toBe(sampleProgram.programId);
    expect(result.programs.featuredProgramId).toBe(sampleProgram.programId);
  });

  it('saves the page layout asset and generated competition feed together', async () => {
    const { saveCompetitionPageLayoutControlsToDisk } = await import('@/utils/competitionPageLayoutControlsPersistence');
    assetAdapterMocks.readAsset.mockResolvedValue(
      new Response(JSON.stringify(createPageAsset()), { status: 200 }),
    );

    const emptyControls = {} as Parameters<typeof saveCompetitionPageLayoutControlsToDisk>[0];
    const emptyContent = {} as Parameters<typeof saveCompetitionPageLayoutControlsToDisk>[1];

    await saveCompetitionPageLayoutControlsToDisk(emptyControls, emptyContent, {
      programs: [sampleProgram],
      featuredProgramId: sampleProgram.programId,
      source: 'asset',
      generatedAt: '2026-05-24T00:00:00.000Z',
    });

    expect(assetAdapterMocks.writeAsset).toHaveBeenCalledTimes(2);
    const pageWrite = assetAdapterMocks.writeAsset.mock.calls.find(([path]) => path === 'Resources/Pages/CompetitionPageLayout.asset');
    const feedWrite = assetAdapterMocks.writeAsset.mock.calls.find(([path]) => path === BucketPath.CompetitionProgramsIndex);
    expect(pageWrite).toBeDefined();
    expect(feedWrite).toBeDefined();
    const pagePayload = JSON.parse(decoder.decode(pageWrite?.[1] as Uint8Array));
    const feedPayload = JSON.parse(decoder.decode(feedWrite?.[1] as Uint8Array));
    expect(pagePayload.data.competitionPrograms.programs[0].programId).toBe(sampleProgram.programId);
    expect(feedPayload.programs[0].programId).toBe(sampleProgram.programId);
    expect(feedPayload.source).toBe('asset');
  });
});
