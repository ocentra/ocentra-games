import { isAssetGUID, isImageHash, type AssetGUIDType, type ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { LobbyPageSvgControls } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { getGameCatalogEntries } from '@/adapters/assets/GameCatalogService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import { findAuthoredSlugForCatalogSlug } from '@/seo/generated/catalogSeoReplacements';

type LooseRecord = Record<string, unknown>;
type ResourceEntryRef = { guid?: string; path?: string; assetType?: string };

type ParsedGameId = {
  name: string;
  guid: AssetGUIDType | null;
};

type AuthoredGameResolution = {
  slug: string;
  guid: AssetGUIDType;
  routeId: string;
};

export type LobbyHeroAssetSlide = {
  id?: string;
  imageHash: ImageHash;
  alt?: string;
};

export type LobbyAssetContext = {
  routeId: string;
  slug: string;
  gameName: string;
  tagline?: string;
  minPlayers?: number;
  maxPlayers?: number;
  layoutControls?: Partial<LobbyPageSvgControls>;
  hero: {
    slides: LobbyHeroAssetSlide[];
    logoImageHash?: ImageHash;
    logoAlt?: string;
    overlayTintColor?: string;
    overlayTintOpacity?: number;
    titleText?: string;
    tagline?: string;
  };
};

const GLOBAL_LOBBY_LAYOUT_ASSET_PATH = 'Resources/Pages/LobbyPageLayout.asset';

function decodeGameIdentifier(identifier: string): string {
  try {
    return decodeURIComponent(identifier);
  } catch {
    return identifier;
  }
}

function parseGameIdentifier(identifier: string): ParsedGameId | null {
  const parts = decodeGameIdentifier(identifier).split(':');
  if (parts.length === 1) {
    const [name] = parts;
    return name ? { name, guid: null } : null;
  }
  if (parts.length !== 2) return null;
  const [name, guidStr] = parts;
  if (!name || !guidStr || !isAssetGUID(guidStr)) return null;
  return { name, guid: guidStr };
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function dataOf(document: unknown): LooseRecord {
  const record = asRecord(document);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
}

function systemOf(document: unknown): LooseRecord {
  return asRecord(asRecord(document).system);
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

async function resolveAuthoredGame(parsed: ParsedGameId): Promise<AuthoredGameResolution | null> {
  if (parsed.guid) {
    return {
      slug: parsed.name,
      guid: parsed.guid,
      routeId: `${parsed.name}:${parsed.guid}`,
    };
  }

  const replacementSlug = findAuthoredSlugForCatalogSlug(slugify(parsed.name));
  const lookupName = replacementSlug ?? parsed.name;
  const normalizedName = slugify(lookupName);
  const entries = await getGameCatalogEntries();
  const entry = entries.find((candidate) => {
    const candidateGameId = candidate.gameId ? String(candidate.gameId) : '';
    const candidateDisplayName = candidate.displayName ?? '';
    return (
      candidate.guid === lookupName ||
      candidateGameId.toLowerCase() === lookupName.toLowerCase() ||
      slugify(candidateGameId) === normalizedName ||
      slugify(candidateDisplayName) === normalizedName
    );
  });

  if (!entry?.guid || !isAssetGUID(entry.guid)) return null;
  const slug = entry.gameId ? String(entry.gameId) : normalizedName;
  return {
    slug,
    guid: entry.guid,
    routeId: `${slug}:${entry.guid}`,
  };
}

async function loadAssetDocumentFromRef(ref: unknown, resources: ResourceEntryRef[], cache?: RequestCache): Promise<LooseRecord | null> {
  const refRecord = asRecord(ref);
  const pathGuid = findGuidByPath(resources, asText(refRecord.path), asText(refRecord.assetType));
  const embeddedGuid = asText(refRecord.guid);
  return await loadAssetDocumentByCandidateGuids([pathGuid, embeddedGuid], cache);
}

async function loadAssetDocumentByPath(path: string, resources: ResourceEntryRef[], assetType = '', cache?: RequestCache): Promise<LooseRecord | null> {
  const guid = findGuidByPath(resources, path, assetType);
  return guid ? await loadRawAssetDocumentByGuid(guid, cache ? { cache } : undefined) : null;
}

async function loadAssetDocumentByCandidateGuids(guids: string[], cache?: RequestCache): Promise<LooseRecord | null> {
  const candidateGuids = guids.filter((guid, index, values) => guid && values.indexOf(guid) === index);
  for (const guid of candidateGuids) {
    const document = await loadRawAssetDocumentByGuid(guid, cache ? { cache } : undefined);
    if (document) return document;
  }
  return null;
}

function findGuidByPath(resources: ResourceEntryRef[], path: string, assetType = ''): string {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return '';
  return resources.find((resource) => (
    resource.guid &&
    normalizePath(resource.path ?? '') === normalizedPath &&
    (!assetType || resource.assetType === assetType)
  ))?.guid ?? '';
}

function extractLobbyControls(layoutDocument: LooseRecord | null): Partial<LobbyPageSvgControls> | undefined {
  const controls = asRecord(dataOf(layoutDocument).lobbyControls);
  return Object.keys(controls).length > 0 ? controls as Partial<LobbyPageSvgControls> : undefined;
}

function buildHeroContext(gameDocument: LooseRecord | null, infoDocument: LooseRecord | null, imagesDocument: LooseRecord | null): LobbyAssetContext['hero'] {
  const gameData = dataOf(gameDocument);
  const infoData = dataOf(infoDocument);
  const infoHero = asRecord(infoData.hero);
  const imagesData = dataOf(imagesDocument);
  const imageSlides = asArray(imagesData.slides)
    .map((slide, index): LobbyHeroAssetSlide | null => {
      const record = asRecord(slide);
      const imageHash = asText(record.imageHash);
      if (!isImageHash(imageHash)) return null;
      return {
        id: asText(record.id) || `lobby-slide-${index + 1}`,
        imageHash,
        alt: asText(record.alt) || asText(record.label),
      };
    })
    .filter((slide): slide is LobbyHeroAssetSlide => slide !== null);
  const bannerImage = asText(gameData.bannerImage);
  const slides = imageSlides.length > 0 || !isImageHash(bannerImage)
    ? imageSlides
    : [{ id: 'lobby-banner', imageHash: bannerImage, alt: asText(infoHero.title) }];
  const logoImageHash = asText(imagesData.logoImageHash);
  return {
    slides,
    logoImageHash: isImageHash(logoImageHash) ? logoImageHash : undefined,
    logoAlt: asText(imagesData.logoAlt),
    overlayTintColor: asText(imagesData.overlayTintColor) || undefined,
    overlayTintOpacity: asNumber(imagesData.overlayTintOpacity),
    titleText: asText(infoHero.title) || undefined,
    tagline: asText(infoHero.subtitle) || undefined,
  };
}

export async function loadLobbyAssetContext(routeGameId: string): Promise<LobbyAssetContext | null> {
  const parsed = parseGameIdentifier(routeGameId);
  if (!parsed) return null;
  const authoredGame = await resolveAuthoredGame(parsed);
  if (!authoredGame) return null;

  const resources = await getEntryIndexResourceEntries();
  const gameDocument = await loadRawAssetDocumentByGuid(authoredGame.guid);
  const gameData = dataOf(gameDocument);
  const infoDocument = await loadAssetDocumentFromRef(gameData.gameInfoAsset, resources);
  const imagesDocument = await loadAssetDocumentFromRef(gameData.carouselImagesAsset, resources);
  const gameLayoutDocument = await loadAssetDocumentFromRef(gameData.lobbyLayoutAsset, resources, 'no-store');
  const fallbackLayoutDocument = gameLayoutDocument
    ? null
    : await loadAssetDocumentByPath(GLOBAL_LOBBY_LAYOUT_ASSET_PATH, resources, 'PageLayout', 'no-store');
  const layoutDocument = gameLayoutDocument ?? fallbackLayoutDocument;
  const infoHero = asRecord(dataOf(infoDocument).hero);
  const system = systemOf(gameDocument);
  const gameName = asText(infoHero.title) || asText(system.displayName) || parsed.name;
  const hero = buildHeroContext(gameDocument, infoDocument, imagesDocument);

  return {
    routeId: authoredGame.routeId,
    slug: authoredGame.slug,
    gameName,
    tagline: hero.tagline,
    minPlayers: asNumber(gameData.minPlayers),
    maxPlayers: asNumber(gameData.maxPlayers),
    layoutControls: extractLobbyControls(layoutDocument),
    hero,
  };
}
