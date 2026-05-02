import { schema } from '@ocentra/schema-domain/effect-builder';
import { NoPlaceholdersValid } from '../shared/validation-guards';

const textSchema = schema.string().trim().min(1).and(NoPlaceholdersValid);

const contentBlockSchema = schema.object({
  type: schema.string().min(1),
}).passthrough();

const pageSchema = schema.object({
  title: textSchema,
  subtitle: schema.string().trim().optional(),
  content: schema.array(contentBlockSchema).optional(),
  linkedAssets: schema.array(schema.string().uuid()).optional(),
  assetRefs: schema.array(schema.record(schema.unknown())).optional(),
}).passthrough();

const sectionSchema = schema.object({
  type: schema.string().min(1),
  tabLabel: schema.string().min(1),
  pages: schema.array(pageSchema).optional(),
  subtitle: schema.string().optional(),
  title: schema.string().optional(),
  content: schema.string().optional(),
}).passthrough();

const featuredBadgeSchema = schema.object({
  label: schema.string().trim().min(1),
  tone: schema.string().trim().optional(),
});

export const GameInfoDataSchema = schema.object({
  hero: schema.object({
    title: textSchema,
    subtitle: schema.string().trim().optional(),
    backgroundImageRef: schema.union([schema.string(), schema.record(schema.unknown())]).optional(),
    ctaButtons: schema.array(schema.record(schema.unknown())).optional(),
  }).optional(),
  sections: schema.array(sectionSchema).optional(),
  description: schema.string().trim().optional(),
  tags: schema.array(schema.string().trim().min(1)).optional(),
  featuredTopBadges: schema.array(featuredBadgeSchema).optional(),
  featuredBottomBadges: schema.array(featuredBadgeSchema).optional(),
  comingSoon: schema.boolean().optional(),
  minPlayers: schema.number().int().nullable().optional(),
  maxPlayers: schema.number().int().nullable().optional(),
  routePath: schema.string().optional(),
  LLM: schema.string().trim().optional(),
  Player: schema.string().trim().optional(),
  tagline: schema.string().trim().optional(),
  tagline2: schema.string().trim().optional(),
  shortDescription: schema.string().trim().optional(),
  gameIconImage: schema.string().optional(),
  gameCategory: schema.string().optional(),
  subcategory: schema.union([schema.string(), schema.null()]).optional(),
  playerMode: schema.string().optional(),
  difficulty: schema.string().optional(),
  duration: schema.string().optional(),
  origin: schema.string().optional(),
  deck: schema.string().optional(),
  alsoKnownAs: schema.array(schema.string().trim()).optional(),
  playersDisplay: schema.string().optional(),
  historyContent: schema.record(schema.unknown()).nullable().optional(),
  setupContent: schema.record(schema.unknown()).nullable().optional(),
  variationsContent: schema.record(schema.unknown()).nullable().optional(),
  aiContent: schema.record(schema.unknown()).nullable().optional(),
  sourcesContent: schema.record(schema.unknown()).nullable().optional(),
  quality: schema.union([schema.string(), schema.null()]).optional(),
  completeness: schema.record(schema.boolean()).nullable().optional(),
  synthesisManifest: schema.object({
    lastSynthesizedAt: schema.union([schema.string(), schema.null()]).optional(),
    dependencies: schema.array(schema.object({
      guid: schema.string().uuid(),
      checksum: schema.string(),
    })).optional(),
  }).optional(),
}).passthrough();
