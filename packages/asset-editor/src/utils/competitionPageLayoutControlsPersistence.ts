import JSON5 from 'json5';
import type { PageLayoutDocument } from '@ocentra/game-asset-domain/ui/pageLayout/PageLayout';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import {
  CompetitionProgramsResponseSchema,
  type CompetitionProgramsResponse,
} from '@ocentra/endpoint-domain/schemas/competition';
import {
  normalizeShopPageContent,
  type ShopPageContentData,
} from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgContent';
import {
  normalizeShopPageSvgControls,
  type ShopPageSvgControls,
} from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgSurfaceControls';
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter';

export const COMPETITION_PAGE_LAYOUT_ASSET_PATH =
  'Resources/Pages/CompetitionPageLayout.asset';

export const COMPETITION_PROGRAMS_FEED_ASSET_PATH =
  BucketPath.CompetitionProgramsIndex;

export type CompetitionPageLayoutAssetDocument = PageLayoutDocument & {
  competitionPrograms?: Record<string, unknown>;
};

interface AssetEnvelope {
  system: Record<string, unknown>;
  data: CompetitionPageLayoutAssetDocument;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeEnvelope(value: unknown): AssetEnvelope {
  const record = asRecord(value);
  return {
    system: asRecord(record.system),
    data: asRecord(record.data) as unknown as CompetitionPageLayoutAssetDocument,
  };
}

function hasProgramsDocument(value: unknown): boolean {
  const record = asRecord(value);
  return Array.isArray(record.programs) || Array.isArray(value);
}

function emptyCompetitionPrograms(generatedAt = new Date().toISOString()): CompetitionProgramsResponse {
  return CompetitionProgramsResponseSchema.parse({
    programs: [],
    source: 'asset',
    generatedAt,
  });
}

export function normalizeCompetitionProgramsDocument(
  value: unknown,
  generatedAt = new Date().toISOString(),
): CompetitionProgramsResponse {
  const record = asRecord(value);
  const candidate = Array.isArray(value)
    ? { programs: value }
    : record;
  return CompetitionProgramsResponseSchema.parse({
    programs: Array.isArray(candidate.programs) ? candidate.programs : [],
    featuredProgramId: typeof candidate.featuredProgramId === 'string' ? candidate.featuredProgramId : undefined,
    source: 'asset',
    generatedAt: typeof candidate.generatedAt === 'string' ? candidate.generatedAt : generatedAt,
  });
}

async function loadCompetitionProgramsFeedFromDisk(): Promise<CompetitionProgramsResponse> {
  const response = await readAsset(COMPETITION_PROGRAMS_FEED_ASSET_PATH);
  if (!response.ok) return emptyCompetitionPrograms();
  try {
    return normalizeCompetitionProgramsDocument(JSON5.parse(await response.text()));
  } catch {
    return emptyCompetitionPrograms();
  }
}

function normalizeCompetitionPageLayoutControls(
  document: Partial<CompetitionPageLayoutAssetDocument> | null | undefined,
): ShopPageSvgControls {
  return normalizeShopPageSvgControls(document?.shopControls);
}

function normalizeCompetitionPageLayoutContent(
  document: Partial<CompetitionPageLayoutAssetDocument> | null | undefined,
): ShopPageContentData {
  return normalizeShopPageContent(document?.shopContent);
}

async function writeJsonAsset(assetPath: string, value: unknown): Promise<void> {
  await writeAsset(
    assetPath,
    new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`),
  );
}

export async function loadCompetitionPageLayoutControlsFromDisk(
  assetPath = COMPETITION_PAGE_LAYOUT_ASSET_PATH,
): Promise<{
  envelope: AssetEnvelope;
  controls: ShopPageSvgControls;
  content: ShopPageContentData;
  programs: CompetitionProgramsResponse;
}> {
  const response = await readAsset(assetPath);
  if (!response.ok) {
    throw new Error(`Failed to load ${assetPath}`);
  }
  const envelope = normalizeEnvelope(JSON5.parse(await response.text()));
  const programs = hasProgramsDocument(envelope.data.competitionPrograms)
    ? normalizeCompetitionProgramsDocument(envelope.data.competitionPrograms)
    : await loadCompetitionProgramsFeedFromDisk();
  return {
    envelope,
    controls: normalizeCompetitionPageLayoutControls(envelope.data),
    content: normalizeCompetitionPageLayoutContent(envelope.data),
    programs,
  };
}

export async function saveCompetitionPageLayoutControlsToDisk(
  controls: ShopPageSvgControls,
  content: ShopPageContentData,
  programs: CompetitionProgramsResponse,
  assetPath = COMPETITION_PAGE_LAYOUT_ASSET_PATH,
): Promise<{
  controls: ShopPageSvgControls;
  content: ShopPageContentData;
  programs: CompetitionProgramsResponse;
}> {
  const { envelope } = await loadCompetitionPageLayoutControlsFromDisk(assetPath);
  const normalizedControls = normalizeShopPageSvgControls(controls);
  const normalizedContent = normalizeShopPageContent(content);
  const normalizedPrograms = normalizeCompetitionProgramsDocument({
    ...programs,
    source: 'asset',
    generatedAt: new Date().toISOString(),
  });
  const nextDocument: CompetitionPageLayoutAssetDocument = {
    ...envelope.data,
    shopControls: normalizedControls,
    shopContent: normalizedContent,
    competitionPrograms: normalizedPrograms as unknown as Record<string, unknown>,
  };
  await writeJsonAsset(assetPath, { ...envelope, data: nextDocument });
  await writeJsonAsset(COMPETITION_PROGRAMS_FEED_ASSET_PATH, normalizedPrograms);
  return {
    controls: normalizedControls,
    content: normalizedContent,
    programs: normalizedPrograms,
  };
}
