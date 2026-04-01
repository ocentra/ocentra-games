import { z } from "zod";
import { CATEGORY, CATEGORY_VALUES, SUB_CATEGORY_VALUES } from "@ocentra/game-domain/game/categories";
import { QUALITY_PARTIAL, QUALITY_VALUES } from "@/schema/types/quality";
import { PLAYER_MODE_VALUES, PLAYER_MODE_SINGLEPLAYER } from "@ocentra/game-domain/game/playerMode";
import { DIFFICULTY_VALUES } from "@ocentra/game-domain/game/difficulty";
import { ACTION_ID_VALUES } from "@ocentra/game-domain/game/actionId";
import {
  EFFECT_TYPE_VALUES,
  COST_SOURCE_VALUES,
  LIMIT_TYPE_VALUES,
  COST_TYPE_FLAT,
  COST_TYPE_MATCH_CURRENT_BET,
  COST_TYPE_MIN_BET,
  COST_TYPE_MIN_RAISE,
  COST_TYPE_POT_LIMIT,
  COST_TYPE_BY_RANK,
  COST_VALUES,
} from "@ocentra/game-domain/game/effect";
import { DECK_TYPE_VALUES } from "@ocentra/game-domain/deck/deckTypes";
import { SUIT_SET_VALUES, RANK_SET_VALUES } from "@ocentra/game-domain/deck/deckFamilies";
import { COMMERCIAL_DECK_TYPE_SET } from '@ocentra/game-domain/deck/commercialDeckTypes';
import { BANNED_DECK_VALUES } from "@/schema/data/banned-deck-values";
import { isValidDeckTriple } from "@ocentra/game-domain/deck/deckCompatibility";
import {
  CATEGORY_REQUIRED_MECHANICS,
  getDeckFamilySet,
  type EngineConfigKey,
} from "@ocentra/game-domain/game/categoryMechanics";
import { validateOverridePaths } from "@/schema/data/override-paths";
import {
  isValidCategorySubcategoryPair,
  getCategorySubcategoryErrorMessage,
} from "@ocentra/game-domain/game/categorySubcategoryMap";
import {
  getScoringRequirements,
  SCORING_FIELD_REQUIRED,
} from "@/schema/data/scoring-requirements";
import {
  ZONE_TYPE_VALUES,
  ZONE_VISIBILITY_VALUES,
  ZONE_OWNER_VALUES,
} from "@ocentra/game-domain/game/zone";
import { isValidZoneId } from "@ocentra/game-domain/game/zoneId";
import { PHASE_ACTOR_VALUES } from "@ocentra/game-domain/game/phaseActor";
import {
  DRAW_SOURCE_VALUES,
  DRAW_VISIBILITY_VALUES,
  DRAW_TIMING_VALUES,
} from "@ocentra/game-domain/deck/drawRules";
import {
  DISCARD_TIMING_VALUES,
  DISCARD_VISIBILITY_VALUES,
} from "@ocentra/game-domain/game/discard";
import {
  INITIAL_DEAL_VALUES,
  HAND_DEFAULT_VALUES,
  STOCK_PURCHASE_VALUES,
  DISCARD_TOP_VALUES,
  TABLEAU_CARDS_VALUES,
  MARKET_CARDS_VALUES,
} from "@ocentra/game-domain/game/cardVisibility";
import { LEGAL_STATUS_NA, LEGAL_STATUS_VALUES } from "@/schema/types/legal";
import { TAGS_VALUES } from "@/schema/types/tags";
import { TRUMP_DETERMINATION_VALUES } from "@ocentra/game-domain/game/trump";
import { MELD_TYPE_VALUES, MELD_TIMING_VALUES } from "@ocentra/game-domain/game/meld";
import { TRICK_WIN_CONDITION_VALUES, BIDDING_SYSTEM_VALUES } from "@ocentra/game-domain/game/trick";
import { REFILL_FROM_VALUES, REFILL_TIMING_VALUES, MARKET_VISIBILITY_VALUES } from "@ocentra/game-domain/game/market";
import { ROUND_END_CONDITION_VALUES, GAME_END_CONDITION_VALUES } from "@ocentra/game-domain/game/roundConfig";
import { TURN_DIRECTION_VALUES, TURN_STARTS_WITH_VALUES } from "@ocentra/game-domain/game/turnOrder";
import { SEAT_LAYOUT_VALUES, PARTNERSHIP_FORMAT_VALUES } from "@ocentra/game-domain/game/playerConfig";
import { BANKER_DETERMINATION_VALUES } from "@ocentra/game-domain/game/banking";
import {
  DECLARATION_TYPE_VALUES,
  DECLARATION_ENCODING_VALUES,
  REVEAL_TIMING_VALUES,
  PIG_PENALTY_VALUES,
} from "@ocentra/game-domain/game/declaration";
import { CAPTURE_METHOD_VALUES } from "@ocentra/game-domain/game/fishing";
import { HAND_RANK_HIGH_VALUES, HAND_RANK_LOW_VALUES } from "@ocentra/game-domain/game/handRanks";
import { BUILD_DIRECTION_VALUES, BUILD_SUIT_RULE_VALUES } from "@ocentra/game-domain/game/patience";
import { SCORING_DIRECTION_VALUES, TARGET_SCORE_NA_VALUES } from "@ocentra/game-domain/game/scoring";
import { SHEDDING_GOAL_VALUES, VALID_PLAY_TYPE_VALUES } from "@ocentra/game-domain/game/shedding";
import { EXTRACTION_STATUS_VALUES, FIELD_STATUS_VALUES } from "@/schema/types/extraction";
import { BUY_CURRENCY_VALUES, NA_UNKNOWN_VALUES, NA_OR_NOT_APPLICABLE_VALUES } from "@ocentra/game-domain/game/buyCosts";
import {
  UI_THEMES_VALUES,
  MARKET_POSITION_VALUES,
  STOCK_POSITION_VALUES,
  DISCARD_POSITION_VALUES,
  PLAYER_HAND_LAYOUT_VALUES,
  POT_POSITION_VALUES,
} from "@/schema/types/synthesis";
import { RNG_USED_VALUES } from "@ocentra/game-domain/game/rngUsed";
import { BETTING_LIMITS_VALUES } from "@ocentra/game-domain/game/bettingLimits";
import { CONSTANTS_KEYS } from "@/schema/types/constants-keys";
import {
  CAN_SUBSTITUTE_FOR_VALUES,
  ACTION_CARD_ACTION_VALUES,
  TARGET_PLAYER_VALUES,
} from "@ocentra/game-domain/game/specialCards";
import { VISIBILITY_VALUES } from "@ocentra/game-domain/game/visibility";

function reference<T>(schema: z.ZodType<T>): z.ZodType<T> {
  return schema;
}

const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /\[.{1,120}\]/,
  /\bT\.?B\.?D\.?\b/i,
  /\bT\.?B\.?A\.?\b/i,
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /\bplaceholder\b/i,
  /\bto be (?:determined|completed|filled(?:\s+in)?|added|written|updated|researched)\b/i,
  /\blorem ipsum\b/i,
  /\b(?:INSERT|ADD|FILL IN?|DESCRIBE|EXPLAIN|WRITE|INCLUDE)\s+(?:HERE|CONTENT|TEXT|INFO|DATA|DETAILS)\b/i,
];

function containsPlaceholder(s: string): boolean {
  return PLACEHOLDER_PATTERNS.some((re) => re.test(s));
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const MIN_CUSTOM_DESCRIPTION_WORDS = 15;

function allFreeOfPlaceholders(...values: Array<string | null | undefined>): boolean {
  return values.every((v) => v == null || !containsPlaceholder(v));
}

function containsPagat(s: string | null | undefined): boolean {
  return s != null && typeof s === "string" && /pagat/i.test(s);
}

const BANNED_SOURCE_MENTION = /\b(pagat(?!\s+ultimo)|wikipedia|wiki)\b/i;

const BANNED_URL_PATTERNS: ReadonlyArray<RegExp> = [
  /^https?:\/\/(?:www\.)?example\.com\b/i,
  /^https?:\/\/(?:www\.)?placeholder\.com\b/i,
  /^https?:\/\/(?:www\.)?example\.org\b/i,
  /\bTBD\b/i,
  /\bTODO\b/i,
  /\bplaceholder\b/i,
  /^https?:\/\/\s*$/,
];

function isBannedUrl(url: string | null | undefined): boolean {
  if (url == null || typeof url !== "string") return false;
  const t = url.trim();
  if (t.length === 0) return true;
  return BANNED_URL_PATTERNS.some((re) => re.test(t));
}

const ALLOWED_NAME_CHARS = /^[\p{L}\p{N}\s\-'.,()|]+$/u;
const NAME_STUB_PATTERNS = [
  /\bsee\s+/i,
  /\bT\.?B\.?D\.?\b/i,
  /\bTODO\b/i,
  /\bN\/?A\b/i,
  /\bUnknown\b/i,
  /\bplaceholder\b/i,
  /^[.\s\-|]+$/,
];

function isValidNameBrand(s: string | null | undefined): boolean {
  if (s == null || typeof s !== "string") return false;
  const t = s.trim();
  if (t.length < 2) return false;
  if (!/\p{L}/u.test(t)) return false;
  if (!ALLOWED_NAME_CHARS.test(t)) return false;
  return !NAME_STUB_PATTERNS.some((re) => re.test(t));
}

function containsBannedSourceMention(s: string | null | undefined): boolean {
  return s != null && typeof s === "string" && BANNED_SOURCE_MENTION.test(s);
}

const STUB_PATTERNS_WHEN_VALIDATED: ReadonlyArray<RegExp> = [
  /\bsee\s+\w+\s+for\s+(full\s+)?rules?\b/i,
  /\bsee\s+\w+\s+for\s+details?\b/i,
  /\bsee\s+\w+\s+for\s+(full\s+)?history\b/i,
  /\bsee\s+\w+\s+for\s+origins?\b/i,
  /\baccording\s+to\s+variant\b/i,
  /\bfollow\s+the\s+(game\s+)?rules?\s+for\s+your\s+variant\b/i,
  /\bsee\s+rules?\s+for\s+(objective|gameplay)\b/i,
  /\b(objective|gameplay)\.\s*See\s+rules\b/i,
  /^[\s\S]*\.\s*See\s+\w+\s+for\s+full\s+rules\.?\s*$/i,
  /\bdocumented\s+in\s+(?:the\s+)?source\b/i,
  /\bdescribed\s+in\s+(?:the\s+)?source\b/i,
  /\brefer\s+to\s+(?:the\s+)?source\b/i,
  /\bsee\s+(?:the\s+)?source\b/i,
  /\bsee\s+pagat\b/i,
  /\bsee\s+wikipedia\b/i,
  /^(?:see|refer to|documented in|described in)\s+\w+\.?\s*$/i,
];

const MIN_ORIGINS_CHARS = 80;
const MIN_OBJECTIVE_CHARS = 50;
const MIN_GAMEPLAY_CHARS = 80;
const MIN_SETUP_FIELD_CHARS = 15;

function containsStubPattern(s: string | null | undefined): boolean {
  if (s == null || typeof s !== "string") return false;
  const t = s.trim();
  return t.length > 0 && STUB_PATTERNS_WHEN_VALIDATED.some((re) => re.test(t));
}

function keyRulesIsSingleStubTemplate(keyRules: string[]): boolean {
  if (keyRules.length !== 1) return false;
  const r = keyRules[0]?.trim() ?? "";
  return (
    /^follow\s+the\s+(game\s+)?rules?\s+for\s+your\s+variant\.?$/i.test(r) ||
    /^see\s+\w+\s+for\s+rules\.?$/i.test(r)
  );
}

function hasStrategyContent(g: { strategy: { basic: string | null; intermediate: string | null; advanced: string | null; tips: string[] } }): boolean {
  const t = (x: string | null) => typeof x === "string" && x.trim().length > 0;
  return t(g.strategy.basic) || t(g.strategy.intermediate) || t(g.strategy.advanced) || g.strategy.tips.length > 0;
}

function isHistoryFilled(g: { history: { origins: string; timeline: string[]; hasPlaceholders: boolean } }): boolean {
  if (g.history.hasPlaceholders) return false;
  const o = (g.history.origins ?? "").trim();
  return o.length >= MIN_ORIGINS_CHARS && g.history.timeline.length >= 1;
}

function isSetupFilled(g: { setup: { players: string; deck: string; dealing: string; hasPlaceholders: boolean } }): boolean {
  if (g.setup.hasPlaceholders) return false;
  return (
    (g.setup.players ?? "").trim().length >= MIN_SETUP_FIELD_CHARS &&
    (g.setup.deck ?? "").trim().length >= MIN_SETUP_FIELD_CHARS &&
    (g.setup.dealing ?? "").trim().length >= MIN_SETUP_FIELD_CHARS
  );
}

function isRulesFilled(g: { rules: { objective: string; gameplay: string; keyRules: string[]; hasPlaceholders: boolean } }): boolean {
  if (g.rules.hasPlaceholders) return false;
  return (
    (g.rules.objective ?? "").trim().length >= MIN_OBJECTIVE_CHARS &&
    (g.rules.gameplay ?? "").trim().length >= MIN_GAMEPLAY_CHARS &&
    (g.rules.keyRules ?? []).length >= 1
  );
}

function isVariationsFilled(g: { variations: { list: unknown[]; noVariationsReason?: string; hasPlaceholders: boolean } }): boolean {
  if (g.variations.hasPlaceholders) return false;
  return g.variations.list.length > 0 || ((g.variations.noVariationsReason ?? "").trim().length >= 15);
}

function isAiFilled(g: { ai: { difficulty: { easy: string | null; medium: string | null; hard: string | null }; considerations: string[]; nullReasons?: Record<string, string>; hasPlaceholders: boolean } }): boolean {
  if (g.ai.hasPlaceholders) return false;
  const d = g.ai.difficulty;
  const hasDiff = (d.easy ?? "").trim() || (d.medium ?? "").trim() || (d.hard ?? "").trim();
  const hasCons = (g.ai.considerations ?? []).length > 0;
  const hasReasons = g.ai.nullReasons != null && Object.keys(g.ai.nullReasons).length > 0;
  return !!hasDiff || hasCons || hasReasons;
}

function meetsCompleteCriteria(g: {
  overview: { hasPlaceholders: boolean; category: string | null };
  history: { hasPlaceholders: boolean };
  setup: { hasPlaceholders: boolean };
  rules: { hasPlaceholders: boolean };
  strategy: { hasPlaceholders: boolean };
  variations: { hasPlaceholders: boolean };
  ai: { hasPlaceholders: boolean };
  sources: { hasPlaceholders: boolean };
  engine: { buyCosts?: { enabled?: boolean; currency?: string } | null };
}): boolean {
  const sections = [
    g.overview.hasPlaceholders,
    g.history.hasPlaceholders,
    g.setup.hasPlaceholders,
    g.rules.hasPlaceholders,
    g.strategy.hasPlaceholders,
    g.variations.hasPlaceholders,
    g.ai.hasPlaceholders,
    g.sources.hasPlaceholders,
  ];
  const allFilled = sections.every((h) => h === false);
  const cat = g.overview.category;
  const categoryOk = cat != null && cat !== "Unknown" && cat !== "Other" && cat !== "Miscellaneous";
  const bc = g.engine.buyCosts;
  const buyCostsOk = bc == null || !bc.enabled || bc.currency !== "Unknown";
  return allFilled && categoryOk && buyCostsOk;
}

const nullReasonsSchema = z
  .record(
    z.string(),
    z
      .string()
      .min(15, { message: "nullReasons entry must be at least 15 chars â€” write an actual explanation" })
      .refine((v) => !containsPlaceholder(v), {
        message: "nullReasons entry must not contain placeholder text",
      })
  )
  .optional();

const ACTION_ID_SET = new Set(ACTION_ID_VALUES);
const actionIdEnum = z.enum(ACTION_ID_VALUES);
const actionRefSchema = z.union([
  actionIdEnum,
  z.string().regex(/^[a-z][a-z0-9_]*$/),
]);

const costSchema = z.union(
  [
    z.object({ type: z.literal(COST_TYPE_FLAT), value: z.number().int().min(0) }),
    z.object({ type: z.literal(COST_TYPE_MATCH_CURRENT_BET) }),
    z.object({ type: z.literal(COST_TYPE_MIN_BET) }),
    z.object({ type: z.literal(COST_TYPE_MIN_RAISE) }),
    z.object({ type: z.literal(COST_TYPE_POT_LIMIT) }),
    z.object({ type: z.literal(COST_TYPE_BY_RANK) }),
    z.literal(COST_VALUES[0]),
    z.literal(COST_VALUES[1]),
  ],
  {
    errorMap: () => ({
      message:
        "cost must be 0, NA, match_current_bet, min_bet, min_raise, pot_limit, byRank, or { type: 'flat', value: number }",
    }),
  }
);

const zoneIdSchema = z
  .string()
  .refine(isValidZoneId, {
    message: "Zone ID must be an engine zone (e.g. hand, stock, market, pot) or custom:name format",
  });

const effectHintsDrawSchema = z
  .object({
    from: zoneIdSchema.optional(),
    to: zoneIdSchema.optional(),
    count: z.number().int().min(1).optional(),
  })
  .strict();

const effectHintsBetSchema = z
  .object({
    amount: z.string().optional(),
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
    limitType: z.enum(LIMIT_TYPE_VALUES).optional(),
  })
  .strict();

const effectHintsBuySchema = z
  .object({
    from: zoneIdSchema.optional(),
    to: zoneIdSchema.optional(),
    costSource: z.enum(COST_SOURCE_VALUES).optional(),
  })
  .strict();

const effectHintsPlaySchema = z
  .object({
    from: zoneIdSchema.optional(),
    to: zoneIdSchema.optional(),
  })
  .strict();

const effectHintsDiscardSchema = z
  .object({
    from: zoneIdSchema.optional(),
    to: zoneIdSchema.optional(),
    count: z.number().int().min(0).optional(),
  })
  .strict();

const effectHintsDealSchema = z
  .object({
    target: zoneIdSchema.optional(),
    count: z.number().int().min(0).optional(),
  })
  .strict();

const effectHintsPassSchema = z.object({}).strict();
const effectHintsFoldSchema = z.object({}).strict();

const effectHintsAnteSchema = z
  .object({ amount: z.string().optional() })
  .strict();

const effectHintsBidSchema = z
  .object({
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
    declarationType: z.string().optional(),
  })
  .strict();

const effectHintsSchema = z.union(
  [
    effectHintsDrawSchema,
    effectHintsBetSchema,
    effectHintsBuySchema,
    effectHintsPlaySchema,
    effectHintsDiscardSchema,
    effectHintsDealSchema,
    effectHintsPassSchema,
    effectHintsFoldSchema,
    effectHintsAnteSchema,
    effectHintsBidSchema,
    z.record(z.unknown()),
  ],
  {
    errorMap: () => ({
      message: "effectHints must match the structure for the action's effectType (draw, bet, buy, play, discard, deal, pass, fold, ante, or bid)",
    }),
  }
);

const playerActionSupportedFalse = z.object({
  supported: z.literal(false),
  description: z.enum(NA_OR_NOT_APPLICABLE_VALUES),
  cost: z.literal(NA_UNKNOWN_VALUES[0]),
  constraints: z.enum(NA_OR_NOT_APPLICABLE_VALUES),
  isTerminating: z.boolean(),
  effectType: z.enum(NA_OR_NOT_APPLICABLE_VALUES),
  effectHints: z.record(z.unknown()).optional(),
  id: z.string().regex(/^[a-z][a-z0-9_]*$/).optional(),
  reason: z
    .string()
    .min(15, { message: "reason must be at least 15 characters â€” write an actual explanation, not a single word" })
    .refine((v) => !containsPlaceholder(v), {
      message: "reason must be a genuine explanation of why this action does not apply, not placeholder text",
    }),
});

const playerActionSupportedTrue = z.object({
  supported: z.literal(true),
  description: z
    .string()
    .min(10)
    .refine((v) => !NA_UNKNOWN_VALUES.includes(v as (typeof NA_UNKNOWN_VALUES)[number])),
  cost: costSchema,
  constraints: z
    .string()
    .min(5)
    .refine((v) => !NA_UNKNOWN_VALUES.includes(v as (typeof NA_UNKNOWN_VALUES)[number])),
  isTerminating: z.boolean(),
  effectType: z
    .enum(EFFECT_TYPE_VALUES)
    .refine((v) => !NA_UNKNOWN_VALUES.includes(v as (typeof NA_UNKNOWN_VALUES)[number])),
  effectHints: effectHintsSchema.optional(),
  id: z.string().regex(/^[a-z][a-z0-9_]*$/).optional(),
});

const playerActionSchema = z.union(
  [playerActionSupportedFalse, playerActionSupportedTrue],
  {
    errorMap: () => ({
      message:
        "playerAction must be one of: (A) supported:true with real description/cost/constraints/effectType; " +
        "or (B) supported:false with NA values AND a reason field (min 15 chars) explaining WHY this action does not apply to this specific game â€” " +
        "e.g. 'Animals is a matching game; there is no betting mechanic.'",
    }),
  }
);

const phaseActorSchema = z.union([
  z.enum(PHASE_ACTOR_VALUES),
  z.string().regex(/^role:[a-z][a-z0-9_]*$/),
  z.string().regex(/^custom:[a-z][a-z0-9_]*$/),
]);

const phaseSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]*$/),
    idTemplate: z.string().optional(),
    repeatCount: z.number().int().min(1).optional(),
    label: z.string(),
    actor: phaseActorSchema,
    legalActions: z.array(actionRefSchema),
    nextPhase: z.union([
      z.null(),
      z.string().regex(/^[a-z][a-z0-9_]*$/),
    ]),
    isMandatory: z.boolean(),
    loopIndex: z.union([z.number().int(), z.null()]),
    totalLoops: z.union([z.number().int(), z.null()]),
    conditionalNext: z.union([
      z.null(),
      z.array(
        z
          .object({
            condition: z.string(),
            nextPhase: z.union([
              z.null(),
              z.string().regex(/^[a-z][a-z0-9_]*$/),
            ]),
          })
          .strict()
      ),
    ]),
    cardVisibilityChanges: z.record(
      z.string().regex(/^[a-z][a-z0-9_]*$/),
      z.enum(VISIBILITY_VALUES)
    ),
    notes: z.union([z.string(), z.null()]),
  })
  .strict();

const completenessSchema = z
  .object({
    overview: z.boolean(),
    history: z.boolean(),
    setup: z.boolean(),
    rules: z.boolean(),
    strategy: z.boolean(),
    variations: z.boolean(),
    ai: z.boolean(),
    sources: z.boolean(),
  })
  .strict();

const playersOverviewSchema = z
  .object({
    minPlayers: z.number().int().min(1),
    maxPlayers: z.number().int().min(1),
    recommendedPlayers: z.union([z.number().int().min(1), z.null()]).optional(),
    display: z.union([z.string(), z.null()]).optional(),
  })
  .strict();

const overviewSchemaBase = z
  .object({
    description: z.string(),
    category: z.enum(CATEGORY_VALUES),
    subCategory: z.union([z.enum(SUB_CATEGORY_VALUES), z.null()]),
    origin: z.string(),
    originName: z.union([z.string().min(1), z.null()]).optional(),
    playerMode: z.enum(PLAYER_MODE_VALUES),
    players: playersOverviewSchema,
    deckType: z.enum(DECK_TYPE_VALUES).optional(),
    deck: z
      .string()
      .min(1)
      .refine((v) => !BANNED_DECK_VALUES.includes(v.trim() as (typeof BANNED_DECK_VALUES)[number]), {
        message: "overview.deck cannot be NA, Unknown, other, or not applicable",
      }),
    difficulty: z.enum(DIFFICULTY_VALUES),
    duration: z.string(),
    hasPlaceholders: z.boolean(),
  })
  .strict();

const overviewSchema = overviewSchemaBase.refine(
  (ov) => {
    const p = ov.players as { minPlayers: number; maxPlayers: number };
    return (
      ov.playerMode !== PLAYER_MODE_SINGLEPLAYER ||
      (p.minPlayers === 1 && p.maxPlayers === 1)
    );
  },
  { message: "singleplayer requires minPlayers=1 and maxPlayers=1", path: ["players"] }
);

const ORIGIN_COUNTRY_PATTERN = /^[\p{L}\p{N}\-\s]+$/u;

const historySchema = z
  .object({
    origins: z.string().min(15),
    originCountries: z
      .array(z.string().min(1).max(80).regex(ORIGIN_COUNTRY_PATTERN, {
        message: "originCountries entries must be one-word or short country tags (e.g. USA, Nepal, Netherlands)",
      }))
      .min(1, { message: "history.originCountries must have at least one country" }),
    timeline: z.array(z.string()),
    evolution: z.union([z.string(), z.null()]),
    cultural: z.union([z.string(), z.null()]),
    hasPlaceholders: z.boolean(),
    nullReasons: nullReasonsSchema,
  })
  .strict();

const setupSchema = z
  .object({
    players: z.string().min(5),
    deck: z.string().min(5),
    equipment: z.string(),
    dealing: z.string().min(5),
    hasPlaceholders: z.boolean(),
  })
  .strict();

const rulesSchema = z
  .object({
    objective: z.string().min(15),
    gameplay: z.string().min(30),
    keyRules: z.array(z.string().min(5)).min(1),
    hasPlaceholders: z.boolean(),
  })
  .strict();

const scoringSchema = z
  .object({
    description: z.string().min(5),
    winCondition: z.string().min(5),
    cardValues: z.record(z.string()),
    penalties: z.record(z.string()),
    splitRules: z.union([z.string(), z.null()]),
    targetScore: z.union([
      z.number(),
      z.enum(TARGET_SCORE_NA_VALUES),
      z.null(),
    ]),
    scoringDirection: z.union([
      z.enum(SCORING_DIRECTION_VALUES),
      z.null(),
    ]),
    hasPlaceholders: z.boolean(),
    nullReasons: nullReasonsSchema,
  })
  .strict();

const strategySchema = z
  .object({
    basic: z.union([z.string(), z.null()]),
    intermediate: z.union([z.string(), z.null()]),
    advanced: z.union([z.string(), z.null()]),
    tips: z.array(z.string()),
    hasPlaceholders: z.boolean(),
    nullReasons: nullReasonsSchema,
  })
  .strict();

const variationItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    overrides: z.record(
      z.string(),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean(), z.null()])
        ),
      ])
    ),
    emptyOverridesReason: z.string().min(15).optional(),
  })
  .strict();

const variationsSchema = z
  .object({
    list: z.array(variationItemSchema),
    hasPlaceholders: z.boolean(),
    noVariationsReason: z.string().min(15).optional(),
  })
  .strict()
  .refine(
    (v) => v.list.length > 0 || (typeof v.noVariationsReason === "string" && v.noVariationsReason.trim().length >= 15),
    { message: "variations.list empty requires variations.noVariationsReason (min 15 chars), e.g. 'Sources describe only the standard form; no regional or rule variations documented.'", path: ["noVariationsReason"] }
  );

const aiSchema = z
  .object({
    difficulty: z
      .object({
        easy: z.union([z.string(), z.null()]),
        medium: z.union([z.string(), z.null()]),
        hard: z.union([z.string(), z.null()]),
      })
      .strict(),
    considerations: z.array(z.string()),
    hasPlaceholders: z.boolean(),
    nullReasons: nullReasonsSchema,
  })
  .strict()
  .refine(
    (a) => {
      const allNull = a.difficulty.easy == null && a.difficulty.medium == null && a.difficulty.hard == null;
      const noConsiderations = (a.considerations ?? []).length === 0;
      if (!allNull || !noConsiderations) return true;
      const nr = a.nullReasons as Record<string, string> | undefined;
      return nr != null && typeof nr === "object" && Object.keys(nr).length > 0;
    },
    { message: "ai: when difficulty is all null and considerations empty, add ai.nullReasons (min one key, 15+ chars each) explaining why, e.g. { easy: 'No AI implementation yet; sources do not describe AI strategy for this game.' }", path: ["nullReasons"] }
  );

const sourceSectionSchema = z
  .object({
    section: z.string().optional(),
    sourcePath: z.string().optional(),
    paragraph: z.number().optional(),
  })
  .strict();

const primarySourceSchema = z
  .object({
    id: z.union([
      z.string().regex(/^src:[a-z0-9_-]+$/),
      z.enum(NA_UNKNOWN_VALUES),
    ]),
    name: z.string(),
    url: z.string().url(),
    retrievedAt: z.string().optional(),
    sections: z.array(sourceSectionSchema).optional(),
    localHtml: z.string().optional(),
  })
  .strict();

const sourcesSchema = z
  .object({
  primary: z.array(primarySourceSchema).min(1),
  additional: z.array(
    z.union([
      z.string(),
      z.object({
        url: z.string().url().optional(),
        localHtml: z.string().optional(),
      }),
    ])
  ),
  hasPlaceholders: z.boolean(),
  })
  .strict();

const evidenceItemSchema = z
  .object({
    path: z.string(),
    sourceId: z.string().optional(),
    quote: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
  })
  .strict();

const evidenceSchema = z.array(evidenceItemSchema);

const overviewNaReasonsSchema = z
  .object({
    category: z.string().min(15).optional(),
    subCategory: z.string().min(15).optional(),
    difficulty: z.string().min(15).optional(),
    origin: z.string().min(15).optional(),
    originName: z.string().min(15).optional(),
    duration: z.string().min(15).optional(),
  })
  .strict()
  .optional();

const extractionSchema = z
  .object({
    status: z.enum(EXTRACTION_STATUS_VALUES),
    missingCritical: z.array(z.string()).optional(),
    assumptions: z.array(z.string()).optional(),
    openQuestions: z.array(z.string()).optional(),
    validatorVersion: z.string().optional(),
    overviewNaReasons: overviewNaReasonsSchema,
  })
  .strict();

const playerActionsSchema = z
  .object(
    Object.fromEntries(ACTION_ID_VALUES.map((id) => [id, playerActionSchema]))
  )
  .strict();

const cardVisibilitySchema = z
  .object({
  handDefault: z.enum(HAND_DEFAULT_VALUES),
  initialDeal: z.enum(INITIAL_DEAL_VALUES),
  marketCards: z.union([
    z.enum(MARKET_CARDS_VALUES),
    z.null(),
  ]),
  stockPurchase: z.union([
    z.enum(STOCK_PURCHASE_VALUES),
    z.null(),
  ]),
  discardTop: z.union([
    z.enum(DISCARD_TOP_VALUES),
    z.null(),
  ]),
  tableauCards: z.union([
    z.enum(TABLEAU_CARDS_VALUES),
    z.null(),
  ]),
  })
  .strict();

const zoneSchema = z
  .object({
  id: zoneIdSchema,
  type: z.enum(ZONE_TYPE_VALUES),
  visibility: z.enum(ZONE_VISIBILITY_VALUES),
  owner: z.enum(ZONE_OWNER_VALUES),
  capacity: z.union([z.number().int(), z.null()]).optional(),
  })
  .strict();

const engineRulesSchema = z
  .object({
    edgeCases: z.array(
    z
      .object({
        id: z.string(),
        appliesTo: z.string().optional(),
        text: z.string(),
        affects: z.string().optional(),
      })
      .strict()
  ),
  })
  .strict();

const drawSourceSchema = z
  .object({
    source: z.enum(DRAW_SOURCE_VALUES),
    visibility: z.enum(DRAW_VISIBILITY_VALUES),
    isOptional: z.boolean(),
    canPickAny: z.boolean(),
    mustRevealCard: z.union([z.boolean(), z.null()]),
    maxPerTurn: z.union([z.number().int(), z.null()]),
    notes: z.union([z.string(), z.null()]),
  })
  .strict();

const drawConfigSchema = z
  .object({
    canDraw: z.boolean(),
    drawSources: z.array(drawSourceSchema),
    drawCount: z.union([z.number().int(), z.null()]),
    drawTiming: z.enum(DRAW_TIMING_VALUES),
    mustDrawBeforePlay: z.boolean(),
    drawAndDiscard: z.boolean(),
  })
  .nullable();

const discardConfigSchema = z
  .object({
    hasDiscard: z.boolean(),
    mustDiscard: z.boolean(),
    discardTiming: z.enum(DISCARD_TIMING_VALUES),
    discardVisibility: z.enum(DISCARD_VISIBILITY_VALUES),
    discardCount: z.union([z.number().int(), z.null()]),
    opponentCanPickFromDiscard: z.boolean(),
    discardPickRules: z
      .object({
        canPickTop: z.boolean(),
        canPickAny: z.boolean(),
        mustTakeAll: z.boolean(),
        mustUsePickedCard: z.boolean(),
        pickCost: z.union([z.string(), z.null()]),
        frozenPileRules: z.union([z.string(), z.null()]),
      })
      .nullable(),
  })
  .nullable();

const naUnknownNull = z.union([
  z.enum(NA_UNKNOWN_VALUES),
  z.null(),
]);

const trumpConfigSchema = z
  .object({
    hasTrump: z.boolean(),
    trumpDetermination: z.enum(TRUMP_DETERMINATION_VALUES),
    permanentTrumps: z
      .array(
        z.object({
          card: z.string(),
          rank: z.union([z.number().int(), z.null()]),
          name: z.union([z.string(), z.null()]),
        })
      )
      .nullable(),
    rightBowerLeftBower: z.boolean(),
    trumpSuitRanking: z.union([z.string(), z.null()]),
    canCallNoTrump: z.boolean(),
    overtakingRule: z.union([z.string(), z.null()]),
  })
  .nullable();

const meldConfigSchema = z
  .object({
    hasMelding: z.boolean(),
    meldTypes: z.array(
      z.object({
        type: z.enum(MELD_TYPE_VALUES),
        minSize: z.number().int(),
        maxSize: z.union([z.number().int(), z.null()]),
        acesHigh: z.union([z.boolean(), z.null()]),
        wildcardAllowed: z.boolean(),
      })
    ),
    meldTiming: z.enum(MELD_TIMING_VALUES),
    layOffAllowed: z.boolean(),
    initialMeldRequirement: z.union([z.string(), z.null()]),
    goingOut: z.object({
      condition: z.string(),
      mustAnnounce: z.boolean(),
      knockOption: z.boolean(),
      knockDeadwoodLimit: z.union([z.number().int(), z.null()]),
    }),
  })
  .nullable();

const trickConfigSchema = z
  .object({
    hasTricks: z.boolean(),
    tricksPerRound: z.union([z.number().int(), z.null()]),
    mustFollowSuit: z.boolean(),
    canTrumpFirstTrick: z.boolean().optional(),
    mustOvertrump: z.union([z.boolean(), z.null()]),
    leadRestrictions: z.union([z.string(), z.null()]),
    trickWinCondition: z.enum(TRICK_WIN_CONDITION_VALUES),
    trickWinnerLeads: z.boolean(),
    scoredTricks: z.boolean(),
    bidding: z
      .object({
        hasBidding: z.boolean(),
        biddingSystem: z.enum(BIDDING_SYSTEM_VALUES),
        minBid: z.union([z.number().int(), z.null()]),
        maxBid: z.union([z.number().int(), z.null()]),
        passAllowed: z.boolean(),
        doubling: z.boolean(),
      })
      .nullable(),
    pointValues: z
      .object({
        defaultPerSuit: z.record(z.string(), z.number()).optional(),
        specificCards: z
          .array(
            z
              .object({
                card: z.string(),
                points: z.number(),
              })
              .strict()
          )
          .optional(),
      })
      .strict()
      .optional(),
  })
  .nullable();

const declarationMechanismSchema = z
  .object({
    type: z.enum(DECLARATION_TYPE_VALUES),
    encoding: z.record(z.string(), z.enum(DECLARATION_ENCODING_VALUES)),
    revealTiming: z.enum(REVEAL_TIMING_VALUES),
    pigRule: z.boolean(),
    pigPenalty: z.union([z.enum(PIG_PENALTY_VALUES), z.null()]),
  })
  .nullable();

const handRanksSchema = z
  .object({
    high: z.union([z.enum(HAND_RANK_HIGH_VALUES), z.null()]),
    low: z.union([z.enum(HAND_RANK_LOW_VALUES), z.null()]),
    lowQualifier: z
      .object({
        maxHighCard: z.number().int(),
        acePlaysLow: z.boolean(),
        straightsAndFlushesCount: z.boolean(),
      })
      .nullable(),
  })
  .nullable();

const buyCostsSchema = z
  .object({
    enabled: z.boolean(),
    currency: z.enum(BUY_CURRENCY_VALUES),
    sources: z.object({
      market: z.object({
        byRank: z.record(z.string(), z.number()),
        flat: z.union([z.number(), z.null()]),
      }),
      stock: z.object({ flat: z.number() }),
      discard: z.union([
        z.object({ flat: z.number() }),
        z.enum(NA_UNKNOWN_VALUES),
        z.null(),
      ]),
    }),
  })
  .nullable();

const marketConfigSchema = z
  .object({
    enabled: z.boolean(),
    size: z.number().int(),
    refillFrom: z.enum(REFILL_FROM_VALUES),
    refillTiming: z.enum(REFILL_TIMING_VALUES),
    visibility: z.enum(MARKET_VISIBILITY_VALUES),
  })
  .nullable();

const wildcardSchema = z
  .object({
    card: z.string(),
    canSubstituteFor: z.enum(CAN_SUBSTITUTE_FOR_VALUES),
    restrictions: z.union([z.string(), z.null()]),
    naturalPreferred: z.boolean(),
  })
  .strict();

const actionCardSchema = z
  .object({
    card: z.string(),
    action: z.enum(ACTION_CARD_ACTION_VALUES),
    drawCount: z.union([z.number().int(), z.null()]),
    targetPlayer: z.enum(TARGET_PLAYER_VALUES),
    notes: z.union([z.string(), z.null()]),
  })
  .strict();

const bonusCardSchema = z
  .object({
    card: z.string(),
    bonusPoints: z.number().int(),
    condition: z.union([z.string(), z.null()]),
  })
  .strict();

const penaltyCardSchema = z
  .object({
    card: z.string(),
    penaltyPoints: z.number().int(),
    notes: z.union([z.string(), z.null()]),
  })
  .strict();

const specialCardsSchema = z.union([
  z.object({
    wildcards: z.array(wildcardSchema).nullable(),
    actionCards: z.array(actionCardSchema).nullable(),
    bonusCards: z.array(bonusCardSchema).nullable(),
    penaltyCards: z.array(penaltyCardSchema).nullable(),
  }),
  naUnknownNull,
]);

const sheddingSchema = z.union([
  z.object({
    hasShedding: z.boolean(),
    sheddingGoal: z.enum(SHEDDING_GOAL_VALUES),
    validPlays: z.array(z.object({ type: z.enum(VALID_PLAY_TYPE_VALUES), notes: z.union([z.string(), z.null()]) })),
    passAllowed: z.boolean(),
    burnRules: z.union([z.string(), z.null()]),
  }),
  naUnknownNull,
]);

const fishingConfigSchema = z.union([
  z.object({
    hasFishing: z.boolean(),
    captureMethod: z.enum(CAPTURE_METHOD_VALUES),
    captureTarget: z.union([z.number().int(), z.null()]),
    sweepBonus: z.union([z.number().int(), z.null()]),
    tableauStartSize: z.union([z.number().int(), z.null()]),
  }),
  naUnknownNull,
]);

const patienceConfigSchema = z.union([
  z.object({
    isSolitaire: z.boolean(),
    tableauColumns: z.union([z.number().int(), z.null()]),
    foundationCount: z.union([z.number().int(), z.null()]),
    buildDirection: z.union([z.enum(BUILD_DIRECTION_VALUES), z.null()]),
    buildSuitRule: z.union([z.enum(BUILD_SUIT_RULE_VALUES), z.null()]),
    redealAllowed: z.boolean(),
    redealCount: z.union([z.number().int(), z.null()]),
  }),
  naUnknownNull,
]);

const bankingConfigSchema = z.union([
  z.object({
    hasBanker: z.boolean(),
    bankerDetermination: z.enum(BANKER_DETERMINATION_VALUES),
    targetValue: z.union([z.number().int(), z.null()]),
    bustRule: z.union([z.string(), z.null()]),
    playerVsBanker: z.boolean(),
  }),
  naUnknownNull,
]);

const playerConfigSchemaBase = z
  .object({
  playerMode: z.enum(PLAYER_MODE_VALUES),
  minPlayers: z.number().int().min(1),
  maxPlayers: z.number().int().min(1),
  optimalPlayers: z.union([z.number().int(), z.null()]),
  startingStack: z.union([z.number().int(), z.null()]),
  seatLayout: z.enum(SEAT_LAYOUT_VALUES),
  partnerships: z.boolean(),
  partnershipFormats: z.array(z.enum(PARTNERSHIP_FORMAT_VALUES)).optional(),
  })
  .strict();

const playerConfigSchema = playerConfigSchemaBase
  .refine(
    (pc) =>
      pc.playerMode !== PLAYER_MODE_SINGLEPLAYER ||
      (pc.minPlayers === 1 && pc.maxPlayers === 1),
    { message: "singleplayer requires minPlayers=1 and maxPlayers=1" }
  )
  .refine(
    (pc) => pc.minPlayers <= pc.maxPlayers,
    { message: "engine.playerConfig.minPlayers must be <= maxPlayers" }
  )
  .refine(
    (pc) =>
      !pc.partnerships ||
      (pc.partnershipFormats != null && pc.partnershipFormats.length > 0),
    {
      message: "partnerships=true requires non-empty partnershipFormats",
      path: ["partnershipFormats"],
    }
  );

const turnOrderSchema = z
  .object({
  direction: z.enum(TURN_DIRECTION_VALUES),
  startsWith: z.enum(TURN_STARTS_WITH_VALUES),
  dealerRotates: z.boolean(),
  })
  .strict();

const roundConfigSchema = z.union([
  z.object({
    hasRounds: z.boolean(),
    roundCount: z.union([z.number().int(), z.null()]),
    roundEndCondition: z.enum(ROUND_END_CONDITION_VALUES),
    gameEndCondition: z.enum(GAME_END_CONDITION_VALUES),
  }),
  naUnknownNull,
]);

const engineSchemaBase = z
  .object({
  phases: z.array(phaseSchema).min(1),
  playerActions: playerActionsSchema,
  playerConfig: playerConfigSchema,
  cardVisibility: cardVisibilitySchema,
  drawConfig: drawConfigSchema,
  discardConfig: discardConfigSchema,
  deckType: z.enum(DECK_TYPE_VALUES),
  suitSet: z.enum(SUIT_SET_VALUES),
  rankSet: z.enum(RANK_SET_VALUES),
  initialHandSize: z.number().int(),
  trumpConfig: trumpConfigSchema,
  meldConfig: meldConfigSchema,
  trickConfig: trickConfigSchema,
  declarationMechanism: declarationMechanismSchema,
  handRanks: handRanksSchema,
  buyCosts: buyCostsSchema,
  marketConfig: marketConfigSchema,
  specialCards: specialCardsSchema,
  shedding: sheddingSchema,
  fishingConfig: fishingConfigSchema,
  patienceConfig: patienceConfigSchema,
  bankingConfig: bankingConfigSchema,
  turnOrder: turnOrderSchema,
  roundConfig: roundConfigSchema,
  constants: z.record(z.enum(CONSTANTS_KEYS), z.number()),
  finalHandSize: z.union([z.number().int(), z.null()]),
  deckCount: z.union([z.number().int().min(1), z.null()]),
  zones: z.array(zoneSchema),
  rules: engineRulesSchema,
  implementationHints: z
    .object({
      rngUsed: z.array(z.enum(RNG_USED_VALUES)).optional(),
      authoritativeServer: z.boolean().optional(),
      customLogicNeeded: z.array(z.string()).optional(),
    })
    .strict(),
  progression: z.array(z.string()).optional(),
  roles: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).optional(),
  customActions: z.array(playerActionSchema.and(z.object({ id: z.string().regex(/^[a-z][a-z0-9_]*$/) }))).optional(),
  jokerCount: z.number().int().min(0).optional(),
  deckDescription: z
    .string()
    .min(1)
    .refine(
      (s) => wordCount(s) >= MIN_CUSTOM_DESCRIPTION_WORDS,
      { message: "deckDescription must be at least 15 words; provide a real explanation of the deck (e.g. composition, suits, ranks, any jokers)." }
    )
    .optional(),
  suitDescription: z
    .string()
    .min(1)
    .refine(
      (s) => wordCount(s) >= MIN_CUSTOM_DESCRIPTION_WORDS,
      { message: "suitDescription must be at least 15 words when present; provide a real explanation of the suit set." }
    )
    .optional(),
  rankDescription: z
    .string()
    .min(1)
    .refine(
      (s) => wordCount(s) >= MIN_CUSTOM_DESCRIPTION_WORDS,
      { message: "rankDescription must be at least 15 words when present; provide a real explanation of the rank set." }
    )
    .optional(),
  dealPattern: z.string().optional(),
  bettingLimits: z.enum(BETTING_LIMITS_VALUES).optional(),
  actions: z.record(z.unknown()).optional(),
  handRankingSystem: z.union([z.string(), z.null()]).optional(),
  rankingSystem: z.union([z.string(), z.null()]).optional(),
  useTrump: z.boolean().optional(),
  notApplicableReasons: z
    .record(
      z.string(),
      z
        .string()
        .min(15, { message: "notApplicableReasons entry must be at least 15 characters â€” write a real explanation" })
        .refine((v) => !containsPlaceholder(v), {
          message: "notApplicableReasons entry must not contain placeholder text",
        })
    )
    .optional(),
  })
  .strict();

const engineSchema = engineSchemaBase
  .refine(
    (e) =>
      isValidDeckTriple(
        e.deckType as string,
        e.suitSet as string,
        e.rankSet as string
      ),
    {
      message:
        "engine.deckType, suitSet, and rankSet must form a valid combination (see deck compatibility matrix)",
    }
  );

const synthesisSchema = z
  .object({
  hero: z.object({
    title: z.string().min(2),
    subtitle: z.string().min(2),
    tagline: z.string().min(5),
  }),
  shortDescription: z.string().min(15),
  uiThemes: z.array(z.enum(UI_THEMES_VALUES)),
  uiLayout: z.object({
    zones: z.array(zoneIdSchema),
    marketPosition: z.union([z.enum(MARKET_POSITION_VALUES), z.null()]),
    stockPosition: z.union([z.enum(STOCK_POSITION_VALUES), z.null()]),
    discardPosition: z.union([z.enum(DISCARD_POSITION_VALUES), z.null()]),
    playerHandLayout: z.enum(PLAYER_HAND_LAYOUT_VALUES),
    potPosition: z.union([z.enum(POT_POSITION_VALUES), z.null()]),
  }),
  })
  .strict();

const promptsSchema = z
  .object({
  human: z.string(),
  ai: z.string(),
  })
  .strict();

interface IOverview extends z.infer<typeof overviewSchema> {}
interface IHistory extends z.infer<typeof historySchema> {}
interface ISetup extends z.infer<typeof setupSchema> {}
interface IRules extends z.infer<typeof rulesSchema> {}
interface IStrategy extends z.infer<typeof strategySchema> {}
interface IVariations extends z.infer<typeof variationsSchema> {}
interface IAi extends z.infer<typeof aiSchema> {}
interface ISources extends z.infer<typeof sourcesSchema> {}
interface IEngine extends z.infer<typeof engineSchema> {}
interface ISynthesis extends z.infer<typeof synthesisSchema> {}
interface IPrompts extends z.infer<typeof promptsSchema> {}
interface IScoring extends z.infer<typeof scoringSchema> {}
interface IEvidence extends z.infer<typeof evidenceSchema> {}
interface IExtraction extends z.infer<typeof extractionSchema> {}

const _GameSchemaInner = z
  .object({
    schemaVersion: z.string(),
    engineModelVersion: z.string(),
    filename: z.string(),
    name: z.string(),
    completeness: completenessSchema,
    quality: z.enum(QUALITY_VALUES),
    qualityReason: z.string().optional(),
    overview: reference<IOverview>(overviewSchema),
    history: reference<IHistory>(historySchema),
    setup: reference<ISetup>(setupSchema),
    rules: reference<IRules>(rulesSchema),
    strategy: reference<IStrategy>(strategySchema),
    variations: reference<IVariations>(variationsSchema),
    ai: reference<IAi>(aiSchema),
    sources: reference<ISources>(sourcesSchema),
  tags: z.array(z.enum(TAGS_VALUES)),
  legal: z
    .object({
      status: z.enum(LEGAL_STATUS_VALUES),
      reasonForNA: z.string().optional(),
      isCommercial: z.boolean(),
      trademarkNote: z.union([z.string(), z.null()]),
    })
    .strict(),
  statistics: z
    .object({
      popularity: z.number().int().min(1).max(100),
      complexity: z.number().int().min(1).max(5),
      luck: z.number().int().min(1).max(10),
      skill: z.number().int().min(1).max(10),
    })
    .strict(),
  media: z
    .object({
      videoTutorial: z.union([z.string(), z.null()]),
    })
    .strict(),
    engine: reference<IEngine>(engineSchema),
    synthesis: reference<ISynthesis>(synthesisSchema),
    prompts: reference<IPrompts>(promptsSchema),
    scoring: reference<IScoring>(scoringSchema),
    alsoKnownAs: z.union([z.array(z.string()), z.null()]),
    evidence: reference<IEvidence>(evidenceSchema),
    extraction: reference<IExtraction>(extractionSchema),
    fieldStatus: z.record(z.enum(FIELD_STATUS_VALUES)).optional(),
  })
  .strict()
  .refine(
    (g) => {
      const ov = g.overview as {
        playerMode: string;
        players: { minPlayers: number; maxPlayers: number };
      };
      const pc = g.engine.playerConfig as {
        playerMode: string;
        minPlayers: number;
        maxPlayers: number;
      };
      return (
        ov.playerMode === pc.playerMode &&
        ov.players.minPlayers === pc.minPlayers &&
        ov.players.maxPlayers === pc.maxPlayers
      );
    },
    {
      message:
        "overview.playerMode, minPlayers, maxPlayers must match engine.playerConfig",
    }
  )
  .refine(
    (g) =>
      (g.overview.deckType ?? null) == null ||
      g.overview.deckType === g.engine.deckType,
    {
      message: "overview.deckType must equal engine.deckType when both present",
    }
  )
  .refine(
    (g) => {
      const engineZoneIds = new Set(g.engine.zones.map((zone) => zone.id));
      return g.synthesis.uiLayout.zones.every((id) => engineZoneIds.has(id));
    },
    {
      message:
        "synthesis.uiLayout.zones must only reference zone IDs that exist in engine.zones (UI layout must map to engine zones)",
      path: ["synthesis", "uiLayout", "zones"],
    }
  )
  .refine(
    (g) => {
      const ids = new Set(g.engine.zones.map((z) => z.id));
      return ids.size === g.engine.zones.length;
    },
    {
      message: "engine.zones must have unique ids",
      path: ["engine", "zones"],
    }
  )
  .refine(
    (g) => {
      const p = g.overview.players as {
        minPlayers: number;
        maxPlayers: number;
        recommendedPlayers?: number | null;
      };
      const rec = p.recommendedPlayers;
      if (rec == null || typeof rec !== "number") return true;
      return rec >= p.minPlayers && rec <= p.maxPlayers;
    },
    {
      message:
        "overview.players.recommendedPlayers must be between minPlayers and maxPlayers when present",
      path: ["overview", "players"],
    }
  )
  .refine(
    (g) => validateOverridePaths(g.variations).valid,
    (g) => {
      const r = validateOverridePaths(g.variations);
      const paths = r.valid ? [] : (r as { invalidPaths: string[] }).invalidPaths;
      return {
        message: `variations.overrides contains invalid paths or values (engine.constants.* must be numeric): ${paths.join(", ")}`,
        path: ["variations"],
      };
    }
  )
  .refine(
    (g) => {
      const engineZoneIds = new Set(g.engine.zones.map((z) => z.id));
      const actions = g.engine.playerActions as Record<string, { effectHints?: { from?: string; to?: string; target?: string } }>;
      const customActions = (g.engine.customActions ?? []) as Array<{
        id: string;
        effectHints?: { from?: string; to?: string; target?: string };
      }>;
      for (const [_, pa] of Object.entries(actions)) {
        const hints = pa?.effectHints as Record<string, string> | undefined;
        if (!hints) continue;
        for (const key of ["from", "to", "target"] as const) {
          const v = hints[key];
          if (typeof v === "string" && v.length > 0 && !engineZoneIds.has(v))
            return false;
        }
      }
      for (const pa of customActions) {
        const hints = pa?.effectHints as Record<string, string> | undefined;
        if (!hints) continue;
        for (const key of ["from", "to", "target"] as const) {
          const v = hints[key];
          if (typeof v === "string" && v.length > 0 && !engineZoneIds.has(v))
            return false;
        }
      }
      return true;
    },
    {
      message:
        "effectHints (from, to, target) must reference zone IDs that exist in engine.zones",
      path: ["engine"],
    }
  )
  .refine(
    (g) => {
      const validActions = new Set(Object.keys(g.engine.playerActions as Record<string, unknown>));
      for (const ca of g.engine.customActions ?? []) {
        const id = (ca as { id: string }).id;
        if (id) validActions.add(id);
      }
      for (const phase of g.engine.phases) {
        for (const aid of phase.legalActions) {
          if (!validActions.has(aid)) return false;
        }
      }
      return true;
    },
    {
      message:
        "phase.legalActions must only reference action IDs that exist in engine.playerActions or engine.customActions",
      path: ["engine", "phases"],
    }
  )
  .refine(
    (g) => {
      const phaseIds = new Set(g.engine.phases.map((p) => p.id));
      for (const phase of g.engine.phases) {
        if (
          phase.nextPhase != null &&
          phase.nextPhase.length > 0 &&
          !phaseIds.has(phase.nextPhase)
        )
          return false;
        for (const cond of phase.conditionalNext ?? []) {
          const np = (cond as { nextPhase?: string | null }).nextPhase;
          if (np != null && np.length > 0 && !phaseIds.has(np)) return false;
        }
      }
      return true;
    },
    {
      message:
        "phase.nextPhase and conditionalNext[].nextPhase must reference phase IDs that exist in engine.phases",
      path: ["engine", "phases"],
    }
  )
  .refine(
    (g) => {
      const validActions = new Set(Object.keys(g.engine.playerActions as Record<string, unknown>));
      for (const ca of g.engine.customActions ?? []) {
        const id = (ca as { id: string }).id;
        if (id) validActions.add(id);
      }
      for (const phase of g.engine.phases) {
        const cvc = phase.cardVisibilityChanges as Record<string, unknown> | undefined;
        if (!cvc) continue;
        for (const aid of Object.keys(cvc)) {
          if (!validActions.has(aid)) return false;
        }
      }
      return true;
    },
    {
      message:
        "phase.cardVisibilityChanges keys must reference action IDs that exist in engine.playerActions or engine.customActions",
      path: ["engine", "phases"],
    }
  )
  .refine(
    (g) => {
      const drawConfig = g.engine.drawConfig;
      if (drawConfig == null || !drawConfig.canDraw) return true;
      const zoneIds = new Set(g.engine.zones.map((z) => z.id));
      const sourceToZone: Record<string, string> = {
        stock: "stock",
        market: "market",
        talon: "talon",
        kitty: "kitty",
        widow: "widow",
        discard_top: "discard",
        discard_any: "discard",
        hand_of_player: "hand",
      };
      for (const ds of drawConfig.drawSources) {
        const zoneId = sourceToZone[ds.source];
        if (zoneId != null && !zoneIds.has(zoneId)) return false;
      }
      return true;
    },
    {
      message:
        "drawConfig.drawSources reference zones (stock, market, discard, etc.) that must exist in engine.zones",
      path: ["engine", "drawConfig"],
    }
  )
  .refine(
    (g) => {
      const cat = g.overview.category;
      if (cat == null) return true;
      const eng = g.engine;
      if (cat === CATEGORY.POKER || cat === CATEGORY.VYING) {
        const hrs = eng.handRankingSystem as string | null | undefined;
        if (hrs == null || (typeof hrs === "string" && hrs.trim().length === 0))
          return false;
      }
      if (cat === CATEGORY.TRICK_TAKING) {
        const ut = eng.useTrump;
        if (ut == null) return false;
      }
      return true;
    },
    {
      message:
        "Poker/Vying games require non-empty handRankingSystem; Trick-taking games require useTrump to be set",
      path: ["engine"],
    }
  )
  .superRefine((g, ctx) => {
    const cat = g.overview.category;
    if (cat == null || cat === CATEGORY.UNKNOWN) return;
    const rules = CATEGORY_REQUIRED_MECHANICS[cat];
    if (rules == null) return;
    const eng = g.engine;
    if (rules.deckFamily != null) {
      const allowed = getDeckFamilySet(rules.deckFamily);
      if (!allowed.has(eng.deckType as string)) {
        const familyLabel = rules.deckFamily === "domino" ? "domino (Double-6/8/9/12, Chinese domino)" : "tile (domino, Mahjong, Hanafuda, etc.)";
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["engine", "deckType"],
          message: `${cat} games require engine.deckType in ${familyLabel} family`,
        });
      }
    }
    if (rules.configs != null) {
      for (const key of rules.configs as readonly EngineConfigKey[]) {
        const val = (eng as Record<string, unknown>)[key];
        if (!isConfigFilled(val) && !requireNAR(eng, key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["engine", key],
            message: `${cat} games require engine.${key} filled or engine.notApplicableReasons.${key} (min 15 chars)`,
          });
        }
      }
    }
    if (rules.trickOrTrump === true) {
      const tc = eng.trickConfig;
      const hasTricks = tc != null && typeof tc === "object" && tc.hasTricks === true;
      const useTrumpSet = eng.useTrump === true || eng.useTrump === false;
      if (!hasTricks && !useTrumpSet && !requireNAR(eng, "trickConfig")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["engine", "trickConfig"],
          message: `${cat} games require engine.trickConfig.hasTricks, engine.useTrump set, or engine.notApplicableReasons.trickConfig (min 15 chars)`,
        });
      }
    }
  })
  .refine(
    (g) => {
      const ids = g.engine.phases.map((p) => p.id);
      return new Set(ids).size === ids.length;
    },
    {
      message: "engine.phases must have unique ids",
      path: ["engine", "phases"],
    }
  )
  .refine(
    (g) => {
      const custom = g.engine.customActions ?? [];
      const ids = custom.map((c) => (c as { id: string }).id);
      if (new Set(ids).size !== ids.length) return false;
      for (const id of ids) {
        if (ACTION_ID_SET.has(id as (typeof ACTION_ID_VALUES)[number]))
          return false;
      }
      return true;
    },
    {
      message:
        "engine.customActions must have unique ids that do not clash with standard action IDs",
      path: ["engine", "customActions"],
    }
  )
  .refine(
    (g) => {
      const actions = g.engine.playerActions as Record<string, { supported?: boolean }>;
      const custom = (g.engine.customActions ?? []) as Array<{ id: string; supported?: boolean }>;
      const supported = new Set<string>();
      for (const [id, pa] of Object.entries(actions)) {
        if (pa?.supported === true) supported.add(id);
      }
      for (const ca of custom) {
        if (ca?.supported === true) supported.add(ca.id);
      }
      for (const phase of g.engine.phases) {
        for (const aid of phase.legalActions) {
          if (!supported.has(aid)) return false;
        }
        const cvc = phase.cardVisibilityChanges as Record<string, unknown> | undefined;
        if (cvc) {
          for (const aid of Object.keys(cvc)) {
            if (!supported.has(aid)) return false;
          }
        }
      }
      return true;
    },
    {
      message:
        "phase.legalActions and cardVisibilityChanges must only reference actions with supported: true",
      path: ["engine", "phases"],
    }
  )
  .refine(
    (g) => {
      const prog = g.engine.progression;
      if (prog == null || prog.length === 0) return true;
      const phaseIds = new Set(g.engine.phases.map((p) => p.id));
      return prog.every((id) => phaseIds.has(id));
    },
    {
      message:
        "engine.progression must only reference phase IDs that exist in engine.phases",
      path: ["engine", "progression"],
    }
  )
  .superRefine((g, ctx) => {
    if (g.quality === QUALITY_PARTIAL) {
      if (meetsCompleteCriteria(g)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quality"],
          message: "game meets complete criteria (all hasPlaceholders false, category real) but quality is partial; set quality = 'complete' and remove qualityReason so agents and UI treat it as complete",
        });
      } else {
        const r = (g as { qualityReason?: string }).qualityReason;
        if (typeof r !== "string" || r.trim().length < 15) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["quality"],
            message: "quality 'partial' requires qualityReason (min 15 chars) â€” explain why the game is not yet complete (e.g. 'History section has placeholder; sources need verification.')",
          });
        }
      }
    }
    if (g.legal.status === LEGAL_STATUS_NA) {
      const r = g.legal.reasonForNA;
      if (typeof r !== "string" || r.trim().length < 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legal"],
          message: "legal.status 'NA' requires legal.reasonForNA (min 15 chars) â€” explain why legal status is unknown (e.g. 'Traditional folk game; no documented IP holder or public domain claim.')",
        });
      }
    }
    if (g.legal.isCommercial) {
      const note = typeof g.legal.trademarkNote === "string" ? g.legal.trademarkNote.trim() : "";
      if (note.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legal", "trademarkNote"],
          message:
            "commercial games must set legal.trademarkNote with the branded or trademarked name so risky titles stay quarantined from asset planning",
        });
      }
      if (g.legal.status === "Public Domain" || g.legal.status === "Patent-Expired") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legal", "status"],
          message:
            "commercial games cannot use legal.status 'Public Domain' or 'Patent-Expired'; use 'Trademarked', 'Proprietary', 'Unknown', or 'NA' with a reason",
        });
      }
    }
    if ((g.legal.status === "Trademarked" || g.legal.status === "Proprietary") && !g.legal.isCommercial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legal", "isCommercial"],
        message:
          "legal.status 'Trademarked' or 'Proprietary' requires legal.isCommercial = true so commercial titles do not drive deck/card/ranking backlog",
      });
    }
    if (COMMERCIAL_DECK_TYPE_SET.has(g.engine.deckType) && !g.legal.isCommercial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legal", "isCommercial"],
        message:
          `engine.deckType '${g.engine.deckType}' is a commercial-only deck family in this repo, so the game must set legal.isCommercial = true`,
      });
    }
    if (!g.history.hasPlaceholders && g.history.timeline.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["history", "timeline"],
        message: "when history.hasPlaceholders is false, history.timeline must have at least one entry (e.g. '19th century: documented in...')",
      });
    }
    if (!g.history.hasPlaceholders) {
      const o = (g.history.origins ?? "").trim();
      if (o.length < MIN_ORIGINS_CHARS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["history", "origins"],
          message: `when history.hasPlaceholders is false, history.origins must be at least ${MIN_ORIGINS_CHARS} chars (substantive content). One-liners like 'Documented in Pagat' or 'See source for history' are banned. Write actual origins, evolution, or cultural context from the primary source.`,
        });
      }
      if (containsStubPattern(g.history.origins)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["history", "origins"],
          message: "history.origins must not contain stub phrasing ('see X for history', 'documented in source', 'refer to source'). Write actual content from the primary source.",
        });
      }
    }
    if (!g.setup.hasPlaceholders) {
      const setupFields = ["players", "deck", "dealing"] as const;
      for (const key of setupFields) {
        const v = (g.setup[key] ?? "").trim();
        if (v.length < MIN_SETUP_FIELD_CHARS) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["setup", key],
            message: `when setup.hasPlaceholders is false, setup.${key} must be at least ${MIN_SETUP_FIELD_CHARS} chars. One-liners are banned; write substantive content from the primary source.`,
          });
        }
        if (containsStubPattern(g.setup[key])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["setup", key],
            message: "setup content must not contain stub phrasing ('see X for', 'documented in source'). Write actual content from the primary source.",
          });
        }
      }
    }
    if (!g.rules.hasPlaceholders) {
      const obj = (g.rules.objective ?? "").trim();
      const gp = (g.rules.gameplay ?? "").trim();
      if (obj.length < MIN_OBJECTIVE_CHARS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rules", "objective"],
          message: `when rules.hasPlaceholders is false, rules.objective must be at least ${MIN_OBJECTIVE_CHARS} chars. One-liners are banned; write the actual objective from the primary source.`,
        });
      }
      if (gp.length < MIN_GAMEPLAY_CHARS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rules", "gameplay"],
          message: `when rules.hasPlaceholders is false, rules.gameplay must be at least ${MIN_GAMEPLAY_CHARS} chars. One-liners are banned; write actual gameplay from the primary source.`,
        });
      }
      if (containsStubPattern(g.rules.objective) || containsStubPattern(g.rules.gameplay)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rules"],
          message: "rules.objective and rules.gameplay must not contain stub phrasing ('see X for rules', 'documented in source'). Write actual content from the primary source.",
        });
      }
    }
    const phases = g.engine.phases;
    if (phases.length > 1) {
      const prog = g.engine.progression;
      if (prog == null || prog.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["engine", "progression"],
          message: "when engine.phases has more than one phase, engine.progression must be non-empty and list phase IDs in order",
        });
      }
    }
    for (let i = 0; i < phases.length; i++) {
      if (phases[i].legalActions.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["engine", "phases", i, "legalActions"],
          message: "each engine.phases[].legalActions must have at least one action ID",
        });
      }
    }
    const banned = (s: string | null | undefined, path: (string | number)[]) => {
      if (containsBannedSourceMention(s)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: path as [string, ...(string | number)[]],
          message: "Pagat, Wikipedia, and wiki mentions are banned outside sources. Replace with actual content from the primary source.",
        });
      }
    };
    const nr = (r: Record<string, string> | undefined, base: string[]) => {
      if (!r) return;
      for (const [k, v] of Object.entries(r)) {
        if (typeof v === "string") banned(v, [...base, "nullReasons", k]);
      }
    };
    banned(g.overview.description, ["overview", "description"]);
    banned(g.overview.origin, ["overview", "origin"]);
    banned(g.overview.deck, ["overview", "deck"]);
    banned(g.overview.duration, ["overview", "duration"]);
    banned(g.history.origins, ["history", "origins"]);
    banned(g.history.evolution ?? "", ["history", "evolution"]);
    banned(g.history.cultural ?? "", ["history", "cultural"]);
    nr(g.history.nullReasons as Record<string, string> | undefined, ["history"]);
    g.history.timeline.forEach((t, i) => banned(t, ["history", "timeline", i]));
    banned(g.setup.players, ["setup", "players"]);
    banned(g.setup.deck, ["setup", "deck"]);
    banned(g.setup.equipment, ["setup", "equipment"]);
    banned(g.setup.dealing, ["setup", "dealing"]);
    banned(g.rules.objective, ["rules", "objective"]);
    banned(g.rules.gameplay, ["rules", "gameplay"]);
    g.rules.keyRules.forEach((k, i) => banned(k, ["rules", "keyRules", i]));
    banned(g.strategy.basic ?? "", ["strategy", "basic"]);
    banned(g.strategy.intermediate ?? "", ["strategy", "intermediate"]);
    banned(g.strategy.advanced ?? "", ["strategy", "advanced"]);
    g.strategy.tips.forEach((t, i) => banned(t, ["strategy", "tips", i]));
    nr(g.strategy.nullReasons as Record<string, string> | undefined, ["strategy"]);
    g.variations.list.forEach((v, i) => {
      banned(v.name, ["variations", "list", i, "name"]);
      banned(v.description, ["variations", "list", i, "description"]);
    });
    nr(g.ai.nullReasons as Record<string, string> | undefined, ["ai"]);
    (g.ai.considerations ?? []).forEach((c, i) => banned(c, ["ai", "considerations", i]));

    g.sources.primary.forEach((s, i) => {
      const u = (s as { url?: string }).url;
      if (u != null && isBannedUrl(u)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sources", "primary", i, "url"],
          message: "sources.primary[].url must be a real, reachable URL. Banned: example.com, placeholder.com, TBD, TODO. If the current URL is wrong or unreachable, find the correct URL (web search, archive.org, or primary source) and update it.",
        });
      }
    });

    const on = (g.overview as { originName?: string | null }).originName;
    const onNa = (v: string | null | undefined) =>
      v == null || (typeof v === "string" && /^(NA|N\/A|Unknown|â€”|â€“|-|\.)$/i.test(v.trim()));
    if (onNa(on)) {
      const r = g.extraction.overviewNaReasons?.originName;
      if (typeof r !== "string" || r.trim().length < 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["overview", "originName"],
          message: "overview.originName is null/NA. Add origin name in the origin's language (e.g. Dhumbal (à¤§à¥à¤®à¥à¤¬à¤² | à¤à¥à¤¯à¤¾à¤ª)) or extraction.overviewNaReasons.originName (min 15 chars) explaining why (e.g. 'Origin cannot be traced; no documented native name found.')",
        });
      }
    }

    if (!isValidNameBrand(g.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "name must be a valid name brand: only letters, digits, space, hyphen, apostrophe, period, comma, parentheses, vertical bar; min 2 chars; no stub (see X, TBD, N/A, Unknown); no unreadable chars",
      });
    }
    const aka = g.alsoKnownAs;
    if (aka != null && Array.isArray(aka)) {
      aka.forEach((item, i) => {
        if (typeof item === "string" && !isValidNameBrand(item)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["alsoKnownAs", i],
            message: "alsoKnownAs entries must be valid name brands: only letters, digits, space, hyphen, apostrophe, period, comma, parentheses, vertical bar; min 2 chars; no stub",
          });
        }
      });
    }

    const naLike = /^(NA|N\/A|Unknown|â€”|â€“|-|\.|TBD|TBA|TODO|placeholder|varied|varies)$/i;
    if (g.overview.category === CATEGORY.UNKNOWN) {
      const r = g.extraction.overviewNaReasons?.category;
      if (typeof r !== "string" || r.trim().length < 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["overview", "category"],
          message: "overview.category cannot be Unknown without extraction.overviewNaReasons.category (min 15 chars) explaining why (e.g. 'Hybrid game; no single category fits.')",
        });
      }
    }
    const originVal = (g.overview.origin ?? "").trim();
    if (originVal.length === 0 || naLike.test(originVal)) {
      const r = g.extraction.overviewNaReasons?.origin;
      if (typeof r !== "string" || r.trim().length < 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["overview", "origin"],
          message: "overview.origin is empty or NA/Unknown. Either set a real origin (e.g. country/region) or extraction.overviewNaReasons.origin (min 15 chars) explaining why (e.g. 'Origin cannot be traced; no documented source.')",
        });
      }
    }
    const durationVal = (g.overview.duration ?? "").trim();
    if (durationVal.length === 0 || naLike.test(durationVal)) {
      const r = g.extraction.overviewNaReasons?.duration;
      if (typeof r !== "string" || r.trim().length < 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["overview", "duration"],
          message: "overview.duration is empty or vague (NA/Unknown/TBD/varied). Either set a real duration (e.g. '15-30 minutes') or extraction.overviewNaReasons.duration (min 15 chars) explaining why (e.g. 'Duration varies by player count and house rules.')",
        });
      }
    }
    if (!g.scoring.hasPlaceholders) {
      const cv = g.scoring.cardValues ?? {};
      const req = getScoringRequirements(g.overview.category);
      const cvEmpty = Object.keys(cv).length === 0;
      if (cvEmpty && req.cardValues === SCORING_FIELD_REQUIRED) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scoring", "cardValues"],
          message: "scoring.cardValues: Shedding/Rummy/Climbing require non-empty cardValues. Add rankâ†’value mapping from primary source.",
        });
      } else if (cvEmpty) {
        const r = (g.scoring.nullReasons as Record<string, string> | undefined)?.cardValues;
        if (typeof r !== "string" || r.trim().length < 15) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["scoring", "cardValues"],
            message: "scoring.cardValues: empty requires scoring.nullReasons.cardValues (min 15 chars), e.g. 'Poker uses hand rankings, not point accumulation.'",
          });
        }
      } else {
        const cvNaLike = /^(NA|N\/A|Unknown|â€”|â€“|-|\.|TBD|placeholder)$/i;
        for (const [k, v] of Object.entries(cv)) {
          if (typeof v !== "string" || v.trim().length === 0 || cvNaLike.test(v.trim())) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["scoring", "cardValues", k],
              message: "scoring.cardValues: each value must be a non-negative numeric string (e.g. '0', '10'); no NA/Unknown/placeholder.",
            });
            break;
          }
          const n = parseInt(String(v).trim(), 10);
          if (!Number.isFinite(n) || n < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["scoring", "cardValues", k],
              message: "scoring.cardValues: value must parse to a non-negative number.",
            });
            break;
          }
        }
      }
      const p = g.scoring.penalties ?? {};
      const penNaLike = /^(NA|N\/A|Unknown|â€”|â€“|-|\.|TBD|placeholder)$/i;
      for (const [k, v] of Object.entries(p)) {
        if (typeof v !== "string" || v.trim().length < 2 || penNaLike.test(v.trim())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["scoring", "penalties", k],
            message: "scoring.penalties: each value must be non-empty (min 2 chars), not NA/Unknown/placeholder.",
          });
          break;
        }
      }
      const ts = g.scoring.targetScore;
      if (ts != null && typeof ts === "number" && ts <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scoring", "targetScore"],
          message: "scoring.targetScore: when numeric, must be > 0.",
        });
      }
      if (req.targetScore === SCORING_FIELD_REQUIRED) {
        const t = g.scoring.targetScore;
        if (t == null || typeof t !== "number" || t <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["scoring", "targetScore"],
            message: "scoring.targetScore: Shedding requires numeric targetScore (e.g. 150). Read primary source.",
          });
        }
      }
      if (req.scoringDirection === SCORING_FIELD_REQUIRED && g.scoring.scoringDirection == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scoring", "scoringDirection"],
          message: "scoring.scoringDirection: Shedding/Rummy/Climbing require scoringDirection (high_wins or low_wins).",
        });
      }
      const ec = g.engine.constants ?? {};
      const ecTs = ec.target_score;
      if (typeof ecTs === "number" && ecTs <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["engine", "constants", "target_score"],
          message: "engine.constants.target_score when set must be > 0.",
        });
      }
      const ecChallenge = ec.challenge_penalty;
      if (typeof ecChallenge === "number" && ecChallenge < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["engine", "constants", "challenge_penalty"],
          message: "engine.constants.challenge_penalty when set must be >= 0.",
        });
      }
      const ecRospisat = ec.rospisat_penalty;
      if (typeof ecRospisat === "number" && ecRospisat < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["engine", "constants", "rospisat_penalty"],
          message: "engine.constants.rospisat_penalty when set must be >= 0.",
        });
      }
      const ecZero = ec.zero_penalty;
      if (typeof ecZero === "number" && ecZero < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["engine", "constants", "zero_penalty"],
          message: "engine.constants.zero_penalty when set must be >= 0.",
        });
      }
    }
  })
  .refine(
    (g) => {
      const desc = g.overview.description?.trim() ?? "";
      const obj = g.rules.objective?.trim() ?? "";
      const gp = g.rules.gameplay?.trim() ?? "";
      return desc.length > 0 && obj.length > 0 && gp.length > 0;
    },
    {
      message:
        "overview.description, rules.objective, and rules.gameplay must not be empty or whitespace-only",
      path: ["overview"],
    }
  )
  .refine(
    (g) => {
      const lazy = /^(Unknown|NA|N\/A|TBD|TBA|TODO|placeholder|none|coming\s+soon|to\s+be\s+added)$/i;
      const desc = (g.overview.description ?? "").trim();
      const obj = (g.rules.objective ?? "").trim();
      const gp = (g.rules.gameplay ?? "").trim();
      return !lazy.test(desc) && !lazy.test(obj) && !lazy.test(gp);
    },
    {
      message:
        "overview.description, rules.objective, rules.gameplay must not be lazy filler (Unknown, NA, TBD, TODO, placeholder)",
      path: ["overview"],
    }
  )
  .refine(
    (g) => {
      if (g.overview.hasPlaceholders) return true;
      return allFreeOfPlaceholders(
        g.overview.description,
        g.overview.origin,
        g.overview.deck,
        g.overview.duration
      );
    },
    {
      message:
        "when overview.hasPlaceholders is false, overview content must not contain placeholder patterns (TBD, TODO, [PLACEHOLDER], etc.)",
      path: ["overview"],
    }
  )
  .refine(
    (g) => {
      if (g.rules.hasPlaceholders) return true;
      return allFreeOfPlaceholders(g.rules.objective, g.rules.gameplay);
    },
    {
      message:
        "when rules.hasPlaceholders is false, rules.objective and rules.gameplay must not contain placeholder patterns",
      path: ["rules"],
    }
  )
  .refine(
    (g) => {
      if (g.setup.hasPlaceholders) return true;
      return allFreeOfPlaceholders(
        g.setup.players,
        g.setup.deck,
        g.setup.equipment,
        g.setup.dealing
      );
    },
    {
      message:
        "when setup.hasPlaceholders is false, setup content must not contain placeholder patterns",
      path: ["setup"],
    }
  )
  .refine(
    (g) => {
      if (g.history.hasPlaceholders) return true;
      return allFreeOfPlaceholders(
        g.history.origins,
        g.history.evolution ?? "",
        g.history.cultural ?? ""
      );
    },
    {
      message:
        "when history.hasPlaceholders is false, history content must not contain placeholder patterns",
      path: ["history"],
    }
  )
  .refine(
    (g) => {
      if (g.strategy.hasPlaceholders) return true;
      return allFreeOfPlaceholders(
        g.strategy.basic ?? "",
        g.strategy.intermediate ?? "",
        g.strategy.advanced ?? ""
      );
    },
    {
      message:
        "when strategy.hasPlaceholders is false, strategy content must not contain placeholder patterns",
      path: ["strategy"],
    }
  )
  .refine(
    (g) => {
      if (g.quality !== "complete") return true;
      const sections = [
        g.overview.hasPlaceholders,
        g.history.hasPlaceholders,
        g.setup.hasPlaceholders,
        g.rules.hasPlaceholders,
        g.strategy.hasPlaceholders,
        g.variations.hasPlaceholders,
        g.ai.hasPlaceholders,
        g.sources.hasPlaceholders,
      ];
      return sections.every((h) => h === false);
    },
    {
      message:
        "quality 'complete' requires hasPlaceholders: false in all sections (overview, history, setup, rules, strategy, variations, ai, sources)",
      path: ["quality"],
    }
  )
  .refine(
    (g) => {
      if (g.quality !== "complete") return true;
      const cat = g.overview.category;
      return cat != null && cat !== "Unknown" && cat !== "Other" && cat !== "Miscellaneous";
    },
    {
      message:
        "quality 'complete' requires overview.category to be a real category, not null, Unknown, Other, or Miscellaneous",
      path: ["overview", "category"],
    }
  )
  .refine(
    (g) => {
      if (g.quality !== "complete") return true;
      const bc = g.engine.buyCosts;
      if (bc == null || !bc.enabled) return true;
      return bc.currency !== "Unknown";
    },
    {
      message:
        "quality 'complete' with buyCosts enabled requires buyCosts.currency to be real (not Unknown)",
      path: ["engine", "buyCosts"],
    }
  )
  .refine(
    (g) => {
      const prog = g.engine.progression;
      if (prog == null || prog.length === 0) return true;
      return new Set(prog).size === prog.length;
    },
    {
      message: "engine.progression must not contain duplicate phase IDs",
      path: ["engine", "progression"],
    }
  )
  .refine(
    (g) => {
      const ihs = g.engine.initialHandSize;
      const mp = g.engine.playerConfig?.maxPlayers ?? 1;
      const total = ihs * mp;
      return total <= 500;
    },
    {
      message:
        "initialHandSize * maxPlayers must not exceed 500 (deck would be exhausted)",
      path: ["engine"],
    }
  )
  .refine(
    (g) => {
      const dp = g.engine.dealPattern as string | undefined;
      if (dp == null || dp === "") return true;
      return dp.trim().length > 0;
    },
    {
      message: "engine.dealPattern must not be whitespace-only when present",
      path: ["engine", "dealPattern"],
    }
  )
  .refine(
    (g) => {
      const hrs = g.engine.handRankingSystem as string | null | undefined;
      if (hrs == null || hrs === "") return true;
      return typeof hrs === "string" && hrs.trim().length > 0;
    },
    {
      message: "engine.handRankingSystem must not be whitespace-only when present",
      path: ["engine", "handRankingSystem"],
    }
  )
  .refine(
    (g) => {
      const mc = g.engine.marketConfig;
      if (mc == null || !mc.enabled) return true;
      const zoneIds = new Set(g.engine.zones.map((z) => z.id));
      return zoneIds.has("market");
    },
    {
      message:
        "marketConfig.enabled: true requires a market zone in engine.zones",
      path: ["engine", "marketConfig"],
    }
  )
  .refine(
    (g) => {
      const bc = g.engine.buyCosts;
      if (bc == null || !bc.enabled) return true;
      const zoneIds = new Set(g.engine.zones.map((z) => z.id));
      const sources = bc.sources as {
        market?: unknown;
        stock?: unknown;
        discard?: unknown;
      };
      if (sources.market != null && ! zoneIds.has("market")) return false;
      if (sources.stock != null && ! zoneIds.has("stock")) return false;
      return true;
    },
    {
      message:
        "buyCosts.enabled: true requires market and stock zones when those sources are configured",
      path: ["engine", "buyCosts"],
    }
  )
  .refine(
    (g) => {
      const tc = g.engine.trickConfig;
      if (tc == null || !tc.hasTricks) return true;
      const zoneIds = new Set(g.engine.zones.map((z) => z.id));
      return zoneIds.has("trick");
    },
    {
      message:
        "trickConfig.hasTricks: true requires a trick zone in engine.zones",
      path: ["engine", "trickConfig"],
    }
  )
  .refine(
    (g) => {
      const p = g.overview.players as { minPlayers: number; maxPlayers: number };
      return p.minPlayers <= p.maxPlayers;
    },
    {
      message: "overview.players.minPlayers must be <= maxPlayers",
      path: ["overview", "players"],
    }
  )
  .refine(
    (g) => {
      for (const phase of g.engine.phases) {
        const li = phase.loopIndex;
        const tl = phase.totalLoops;
        if (li != null && tl != null && typeof li === "number" && typeof tl === "number") {
          if (li > tl) return false;
        }
      }
      return true;
    },
    {
      message: "phase.loopIndex must be <= totalLoops when both are set",
      path: ["engine", "phases"],
    }
  )
  .refine(
    (g) => {
      const tc = g.engine.trickConfig;
      if (tc?.bidding == null || !tc.bidding.hasBidding) return true;
      const b = tc.bidding;
      const minB = b.minBid;
      const maxB = b.maxBid;
      if (minB == null || maxB == null) return true;
      return minB <= maxB;
    },
    {
      message: "trickConfig.bidding: minBid must be <= maxBid when both set",
      path: ["engine", "trickConfig"],
    }
  )
  .refine(
    (g) => {
      const ihs = g.engine.initialHandSize;
      return typeof ihs === "number" && ihs >= 0 && ihs <= 200;
    },
    {
      message: "engine.initialHandSize must be between 0 and 200",
      path: ["engine", "initialHandSize"],
    }
  )
  .refine(
    (g) => {
      const eng = g.engine;
      const roles = new Set(eng.roles ?? []);
      for (const phase of eng.phases) {
        const actor = phase.actor as string;
        if (actor.startsWith("role:") && actor.length > 5) {
          const roleId = actor.slice(5);
          if (!roles.has(roleId)) return false;
        }
      }
      return true;
    },
    {
      message:
        "phase.actor role:xxx requires that role to exist in engine.roles",
      path: ["engine", "phases"],
    }
  )
  .refine(
    (g) => {
      const list = g.variations.list;
      const ids = list.filter((v) => (v.id ?? "").trim().length > 0).map((v) => v.id);
      return new Set(ids).size === ids.length;
    },
    {
      message: "variations.list must have unique ids (when id is non-empty)",
      path: ["variations", "list"],
    }
  )
  .refine(
    (g) =>
      g.variations.list.every((v) => {
        const keys = Object.keys(v.overrides ?? {});
        if (keys.length > 0) return true;
        const r = v.emptyOverridesReason;
        return typeof r === "string" && r.trim().length >= 15;
      }),
    {
      message:
        "Each variation with empty overrides must have emptyOverridesReason (min 15 chars), e.g. 'Find more info and add overrides so we can make game.' Either add engine overrides for the variant or explain what is needed.",
      path: ["variations", "list"],
    }
  )
  .refine(
    (g) => {
      const eng = g.engine;
      const bl = eng.bettingLimits as string | undefined;
      const nonBetting = ["None", "NA", "Unknown"];
      if (bl == null || nonBetting.includes(bl)) return true;
      const ss = eng.playerConfig?.startingStack as number | null | undefined;
      if (ss == null) return true;
      return ss > 0;
    },
    {
      message:
        "betting game (bettingLimits not none) requires startingStack > 0 when set",
      path: ["engine", "playerConfig"],
    }
  );

function requireNAR(
  engine: { notApplicableReasons?: Record<string, string> },
  key: string
): boolean {
  const r = engine.notApplicableReasons?.[key];
  return typeof r === "string" && r.trim().length >= 15;
}

function requireNullReason(
  section: { nullReasons?: Record<string, string> },
  key: string
): boolean {
  const r = (section.nullReasons as Record<string, string> | undefined)?.[key];
  return typeof r === "string" && r.trim().length >= 15;
}

const NA_STRINGS = new Set(["NA", "not applicable", "Unknown", null]);

function isConfigFilled(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "string" && NA_STRINGS.has(val)) return false;
  return typeof val === "object";
}

export const GameSchema = _GameSchemaInner
  .refine(
    (g) => !g.completeness.overview || !g.overview.hasPlaceholders,
    { message: "completeness.overview cannot be true when overview.hasPlaceholders is true", path: ["completeness", "overview"] }
  )
  .refine(
    (g) => !g.completeness.history || !g.history.hasPlaceholders,
    { message: "completeness.history cannot be true when history.hasPlaceholders is true", path: ["completeness", "history"] }
  )
  .refine(
    (g) => !g.completeness.setup || !g.setup.hasPlaceholders,
    { message: "completeness.setup cannot be true when setup.hasPlaceholders is true", path: ["completeness", "setup"] }
  )
  .refine(
    (g) => !g.completeness.rules || !g.rules.hasPlaceholders,
    { message: "completeness.rules cannot be true when rules.hasPlaceholders is true", path: ["completeness", "rules"] }
  )
  .refine(
    (g) => !g.completeness.strategy || !g.strategy.hasPlaceholders,
    { message: "completeness.strategy cannot be true when strategy.hasPlaceholders is true", path: ["completeness", "strategy"] }
  )
  .refine(
    (g) => !g.completeness.variations || !g.variations.hasPlaceholders,
    { message: "completeness.variations cannot be true when variations.hasPlaceholders is true", path: ["completeness", "variations"] }
  )
  .refine(
    (g) => !g.completeness.ai || !g.ai.hasPlaceholders,
    { message: "completeness.ai cannot be true when ai.hasPlaceholders is true", path: ["completeness", "ai"] }
  )
  .refine(
    (g) => !g.completeness.sources || !g.sources.hasPlaceholders,
    { message: "completeness.sources cannot be true when sources.hasPlaceholders is true", path: ["completeness", "sources"] }
  )
  .superRefine((g, ctx) => {
    if (isHistoryFilled(g) && !g.completeness.history) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completeness", "history"],
        message: "history is filled (origins >= 80 chars, timeline >= 1, hasPlaceholders false) but completeness.history is not true; set completeness.history = true",
      });
    }
    if (isSetupFilled(g) && !g.completeness.setup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completeness", "setup"],
        message: "setup is filled (players/deck/dealing >= 15 chars each, hasPlaceholders false) but completeness.setup is not true; set completeness.setup = true",
      });
    }
    if (isRulesFilled(g) && !g.completeness.rules) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completeness", "rules"],
        message: "rules is filled (objective >= 50, gameplay >= 80, keyRules present, hasPlaceholders false) but completeness.rules is not true; set completeness.rules = true",
      });
    }
    if (!g.strategy.hasPlaceholders && hasStrategyContent(g) && !g.completeness.strategy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completeness", "strategy"],
        message: "strategy is filled (basic/intermediate/advanced/tips has content, hasPlaceholders false) but completeness.strategy is not true; set completeness.strategy = true",
      });
    }
    if (isVariationsFilled(g) && !g.completeness.variations) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completeness", "variations"],
        message: "variations is filled (list has items or noVariationsReason, hasPlaceholders false) but completeness.variations is not true; set completeness.variations = true",
      });
    }
    if (isAiFilled(g) && !g.completeness.ai) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completeness", "ai"],
        message: "ai is filled (difficulty/considerations/nullReasons has content, hasPlaceholders false) but completeness.ai is not true; set completeness.ai = true",
      });
    }
  })
  .refine(
    (g) => {
      const cat = g.overview.category;
      if (cat != null && cat !== "Unknown") return true;
      const r = g.extraction.overviewNaReasons?.category;
      return typeof r === "string" && r.trim().length >= 15;
    },
    {
      message:
        "overview.category is null or Unknown. Either set a real category from the primary source (e.g. Poker, Trick-taking), or add extraction.overviewNaReasons.category (min 15 characters) explaining why it is not applicable for this game.",
      path: ["overview", "category"],
    }
  )
  .refine(
    (g) => {
      const cat = g.overview.category;
      return cat !== "Other" && cat !== "Miscellaneous";
    },
    {
      message:
        "overview.category cannot be Other or Miscellaneous. Determine the correct category from the primary source (e.g. Poker, Trick-taking, Shedding, Rummy, Domino, War, Banking). If no existing category fits, extend the category list â€” Other and Miscellaneous are not allowed.",
      path: ["overview", "category"],
    }
  )
  .refine(
    (g) => {
      const origin = (g.overview.origin ?? "").trim();
      const naLike = /^(NA|N\/A|Unknown|â€”|â€“|-|\.)$/i;
      if (origin.length > 0 && !naLike.test(origin)) return true;
      const r = g.extraction.overviewNaReasons?.origin;
      return typeof r === "string" && r.trim().length >= 15;
    },
    {
      message:
        "overview.origin is empty or NA/Unknown. Either set a real origin (e.g. country/region) from the primary source, or add extraction.overviewNaReasons.origin (min 15 characters) explaining why it is not applicable for this game.",
      path: ["overview", "origin"],
    }
  )
  .refine(
    (g) => {
      const duration = (g.overview.duration ?? "").trim();
      const naLike = /^(NA|N\/A|Unknown|â€”|â€“|-|\.)$/i;
      if (duration.length > 0 && !naLike.test(duration)) return true;
      const r = g.extraction.overviewNaReasons?.duration;
      return typeof r === "string" && r.trim().length >= 15;
    },
    {
      message:
        "overview.duration is empty or NA/Unknown. Either set a real duration (e.g. '15-30 minutes') from the primary source, or add extraction.overviewNaReasons.duration (min 15 characters) explaining why it is not applicable for this game.",
      path: ["overview", "duration"],
    }
  )
  .refine(
    (g) => {
      const sc = g.overview.subCategory;
      if (sc != null && typeof sc === "string" && sc.trim().length > 0) return true;
      const r = g.extraction.overviewNaReasons?.subCategory;
      return typeof r === "string" && r.trim().length >= 15;
    },
    {
      message:
        "overview.subCategory is required; cannot be null, NA, or placeholder. Set a real subCategory from the primary source (e.g. Scopa Family for Fishing, Community Card for Poker).",
      path: ["overview", "subCategory"],
    }
  )
  .refine(
    (g) => {
      const cat = g.overview.category;
      const sc = g.overview.subCategory;
      const naLike = /^(NA|N\/A|Unknown|â€”|â€“|-|\.|TBD|placeholder|none)$/i;
      if (cat == null || ["Unknown", "Other", "Miscellaneous"].includes(cat) || naLike.test(String(cat ?? "").trim()))
        return false;
      if (sc == null || typeof sc !== "string" || sc.trim().length === 0 || naLike.test(sc.trim())) return false;
      return isValidCategorySubcategoryPair(cat, sc);
    },
    (g) => {
      const cat = g.overview.category;
      const sc = g.overview.subCategory;
      const naLike = /^(NA|N\/A|Unknown|â€”|â€“|-|\.|TBD|placeholder|none)$/i;
      let msg: string;
      if (
        cat == null ||
        ["Unknown", "Other", "Miscellaneous"].includes(cat ?? "") ||
        naLike.test(String(cat ?? "").trim())
      )
        msg =
          "overview.category cannot be null, Unknown, Other, Miscellaneous, or NA. Set a real category from the primary source (e.g. Poker, Trick-taking, Fishing).";
      else if (
        sc == null ||
        typeof sc !== "string" ||
        sc.trim().length === 0 ||
        naLike.test(String(sc ?? "").trim())
      )
        msg =
          "overview.subCategory cannot be null, NA, or placeholder. Set a real subcategory from the primary source.";
      else msg = getCategorySubcategoryErrorMessage(cat ?? "", sc ?? "");
      return { message: msg, path: ["overview", "subCategory"] as const };
    }
  )
  .refine(
    (g) => {
      if (g.extraction.status !== "validated") return true;
      const mc = g.extraction.missingCritical;
      return mc == null || mc.length === 0;
    },
    {
      message:
        "extraction.missingCritical must be empty when status is 'validated'. Fill every critical field from the primary source (sources.primary URL or HTML); do not mark validated until you have read the source and filled missing data.",
      path: ["extraction", "status"],
    }
  )
  .refine(
    (g) => {
      if (g.extraction.status !== "validated") return true;
      const cat = g.overview.category;
      return cat != null && cat !== "Unknown" && cat !== "Other" && cat !== "Miscellaneous";
    },
    {
      message:
        "overview.category cannot be Unknown, null, Other, or Miscellaneous when status is 'validated'. Read the primary source (sources.primary URL or HTML) for this game, determine the correct category (e.g. Poker, Trick-taking, Shedding, Rummy), and set overview.category. If no existing category fits, extend the category list â€” Other and Miscellaneous are not allowed.",
      path: ["overview", "category"],
    }
  )
  .refine(
    (g) => {
      if (g.extraction.status !== "validated") return true;
      return (
        !containsPagat(g.overview.description) &&
        !containsPagat(g.history.origins) &&
        !containsPagat(g.setup.dealing) &&
        !containsPagat(g.rules.objective) &&
        !containsPagat(g.rules.gameplay)
      );
    },
    {
      message:
        "Key fields (overview.description, history.origins, setup.dealing, rules.objective, rules.gameplay) must not contain 'see Pagat' or Pagat references when status is 'validated'. Read the primary source (sources.primary URL or HTML) and fill these fields with actual content from that source; do not leave pointers to external sites.",
      path: ["extraction", "status"],
    }
  )
  .refine(
    (g) => {
      if (g.extraction.status !== "validated") return true;
      if (!g.strategy.hasPlaceholders) return true;
      return hasStrategyContent(g);
    },
    {
      message:
        "strategy must have real content (at least one of basic, intermediate, advanced, or tips) when status is 'validated'. Read the primary source (sources.primary URL or HTML) for this game and add strategy content from the source.",
      path: ["strategy"],
    }
  )
  .refine(
    (g) => {
      if (g.extraction.status !== "validated") return true;
      if (!g.variations.hasPlaceholders || g.variations.list.length > 0) return true;
      return false;
    },
    {
      message:
        "variations.list cannot be empty when status is 'validated' and variations.hasPlaceholders is true. Read the primary source (sources.primary URL or HTML) for this game and add at least one variation with real name and description from the source.",
      path: ["variations"],
    }
  )
  .refine(
    (g) => {
      if (g.extraction.status !== "validated") return true;
      return (
        !containsStubPattern(g.overview.description) &&
        !containsStubPattern(g.history.origins) &&
        !containsStubPattern(g.setup.players) &&
        !containsStubPattern(g.setup.deck) &&
        !containsStubPattern(g.setup.dealing) &&
        !containsStubPattern(g.rules.objective) &&
        !containsStubPattern(g.rules.gameplay)
      );
    },
    {
      message:
        "Key fields must not contain stub phrasing ('see X for rules/details/history', 'documented in source', 'refer to source'). Read the primary source (sources.primary URL or HTML) and fill overview.description, history.origins, setup.players/deck/dealing, rules.objective, rules.gameplay with actual text; do not leave pointers.",
      path: ["extraction", "status"],
    }
  )
  .refine(
    (g) => {
      if (g.extraction.status !== "validated") return true;
      return g.quality !== "stub";
    },
    {
      message:
        "quality cannot be 'stub' when status is 'validated'. Read the primary source (sources.primary URL or HTML) and fill overview, history, setup, rules with real content so quality can be at least partial or draft; then set quality accordingly.",
      path: ["quality"],
    }
  )
  .refine(
    (g) => {
      if (g.extraction.status !== "validated") return true;
      const c = g.completeness;
      return (
        c.overview === true || c.history === true || c.setup === true || c.rules === true
      );
    },
    {
      message:
        "At least one of completeness.overview, .history, .setup, .rules must be true when status is 'validated'. Read the primary source (sources.primary URL or HTML) and fill the corresponding sections with real content so at least one completeness flag is true.",
      path: ["completeness"],
    }
  )
  .refine(
    (g) => {
      if (g.extraction.status !== "validated") return true;
      return !keyRulesIsSingleStubTemplate(g.rules.keyRules);
    },
    {
      message:
        "rules.keyRules cannot be only 'Follow the game rules for your variant' when status is 'validated'. Read the primary source (sources.primary URL or HTML) and list the actual key rules (e.g. matching rules, win condition, special cards).",
      path: ["rules", "keyRules"],
    }
  )
  .refine(
    (g) => {
      if (g.extraction.status !== "validated") return true;
      const origin = (g.overview.origin ?? "").trim();
      const duration = (g.overview.duration ?? "").trim();
      const naLike = /^(NA|N\/A|Unknown|â€”|â€“|-|\.)$/i;
      return origin.length > 0 && !naLike.test(origin) && duration.length > 0 && !naLike.test(duration);
    },
    {
      message:
        "overview.origin and overview.duration must be non-empty and not NA/Unknown when status is 'validated'. Read the primary source (sources.primary URL or HTML) and set origin (e.g. country/region) and duration (e.g. '15-30 minutes') from the source.",
      path: ["overview"],
    }
  )
  .refine(
    (g) => {
      if (g.extraction.status !== "validated") return true;
      const desc = (g.overview.description ?? "").trim();
      return desc.length >= 80;
    },
    {
      message:
        "overview.description must be at least 80 characters when status is 'validated'. Read the primary source (sources.primary URL or HTML) and write a real summary (what the game is, how it works); do not use a one-liner or 'see X for full rules'.",
      path: ["overview", "description"],
    }
  )
  .refine(
    (g) => {
      if (g.scoring.hasPlaceholders) return true;
      return allFreeOfPlaceholders(
        g.scoring.description,
        g.scoring.winCondition,
        typeof g.scoring.splitRules === "string" ? g.scoring.splitRules : null
      );
    },
    {
      message: "when scoring.hasPlaceholders is false, scoring content must not contain placeholder patterns",
      path: ["scoring"],
    }
  )
  .refine(
    (g) => {
      if (g.rules.hasPlaceholders) return true;
      return g.rules.keyRules.every((r) => !containsPlaceholder(r));
    },
    {
      message: "when rules.hasPlaceholders is false, keyRules items must not contain placeholder text",
      path: ["rules", "keyRules"],
    }
  )
  .refine(
    (g) => {
      if (g.sources.hasPlaceholders) return true;
      const naSet = new Set(NA_UNKNOWN_VALUES as readonly string[]);
      return g.sources.primary.some((s) => !naSet.has(s.id));
    },
    {
      message:
        "sources.primary must contain at least one source with a real id (not NA/Unknown) when sources.hasPlaceholders is false. Read the actual source (URL or HTML) for this game and set the source id and name from it; do not leave placeholder ids.",
      path: ["sources", "primary"],
    }
  )
  .refine(
    (g) => {
      if (g.sources.hasPlaceholders) return true;
      return g.sources.primary.every((s) => !containsPlaceholder(s.name));
    },
    {
      message:
        "sources.primary source names must not contain placeholder text when sources.hasPlaceholders is false. Read the actual source (URL or HTML) and use the real title or site name (e.g. 'Pagat.com - Game Name'); do not leave placeholder names.",
      path: ["sources", "primary"],
    }
  )
  .refine(
    (g) => {
      for (const item of g.evidence) {
        const conf = item.confidence;
        if (conf != null && conf >= 0.85) {
          const hasQuote = typeof item.quote === "string" && item.quote.trim().length > 0;
          const hasNotes = typeof item.notes === "string" && item.notes.trim().length > 0;
          if (!hasQuote && !hasNotes) return false;
        }
      }
      return true;
    },
    {
      message: "evidence items with confidence >= 0.85 must have a non-empty quote or notes â€” high confidence claims need backing",
      path: ["evidence"],
    }
  )
  .refine(
    (g) => g.evidence.every((e) => !containsPlaceholder(e.path)),
    {
      message: "evidence item paths must not contain placeholder text",
      path: ["evidence"],
    }
  )
  .refine(
    (g) => {
      if (g.variations.hasPlaceholders) return true;
      return g.variations.list.every(
        (v) => !containsPlaceholder(v.name) && !containsPlaceholder(v.description)
      );
    },
    {
      message: "when variations.hasPlaceholders is false, variation names and descriptions must not contain placeholder text",
      path: ["variations", "list"],
    }
  )
  .refine(
    (g) => {
      if (g.ai.hasPlaceholders) return true;
      return g.ai.considerations.every((c) => !containsPlaceholder(c));
    },
    {
      message: "when ai.hasPlaceholders is false, ai.considerations items must not contain placeholder text",
      path: ["ai", "considerations"],
    }
  )
  .refine(
    (g) => {
      if (g.history.hasPlaceholders) return true;
      return g.history.timeline.every((t) => !containsPlaceholder(t));
    },
    {
      message: "when history.hasPlaceholders is false, history.timeline items must not contain placeholder text",
      path: ["history", "timeline"],
    }
  )
  .refine(
    (g) => {
      if (g.strategy.hasPlaceholders) return true;
      return g.strategy.tips.every((t) => !containsPlaceholder(t));
    },
    {
      message: "when strategy.hasPlaceholders is false, strategy.tips items must not contain placeholder text",
      path: ["strategy", "tips"],
    }
  )
  .refine(
    (g) => {
      const dc = g.engine.drawConfig;
      if (dc !== null) return true;
      return requireNAR(g.engine, "drawConfig");
    },
    {
      message:
        "engine.drawConfig: null requires engine.notApplicableReasons.drawConfig â€” " +
        "explain why draw does not apply (e.g. 'Animals is a memory game; players never draw from a pile.')",
      path: ["engine", "drawConfig"],
    }
  )
  .refine(
    (g) => {
      const dc = g.engine.discardConfig;
      if (dc !== null) return true;
      return requireNAR(g.engine, "discardConfig");
    },
    {
      message:
        "engine.discardConfig: null requires engine.notApplicableReasons.discardConfig â€” " +
        "explain why discard does not apply (e.g. 'Matched pairs are removed from play; there is no discard pile.')",
      path: ["engine", "discardConfig"],
    }
  )
  .refine(
    (g) => {
      const sc = g.engine.specialCards;
      if (sc !== null && !NA_STRINGS.has(sc as string | null)) return true;
      return requireNAR(g.engine, "specialCards");
    },
    {
      message:
        "engine.specialCards: null/NA requires engine.notApplicableReasons.specialCards â€” " +
        "explain why (e.g. 'Standard 52-card deck; no card has a special action or bonus value.')",
      path: ["engine", "specialCards"],
    }
  )
  .refine(
    (g) => {
      const sh = g.engine.shedding;
      if (sh !== null && !NA_STRINGS.has(sh as string | null)) return true;
      return requireNAR(g.engine, "shedding");
    },
    {
      message:
        "engine.shedding: null/NA requires engine.notApplicableReasons.shedding â€” " +
        "explain why (e.g. 'Animals is a matching game, not a shedding game; the goal is to collect pairs, not empty your hand.')",
      path: ["engine", "shedding"],
    }
  )
  .refine(
    (g) => {
      const fc = g.engine.fishingConfig;
      if (fc !== null && !NA_STRINGS.has(fc as string | null)) return true;
      return requireNAR(g.engine, "fishingConfig");
    },
    {
      message:
        "engine.fishingConfig: null/NA requires engine.notApplicableReasons.fishingConfig â€” " +
        "explain why (e.g. 'Animals uses a flip-and-match mechanic, not a play-to-capture fishing mechanic.')",
      path: ["engine", "fishingConfig"],
    }
  )
  .refine(
    (g) => {
      const rc = g.engine.roundConfig;
      if (rc !== null && !NA_STRINGS.has(rc as string | null)) return true;
      return requireNAR(g.engine, "roundConfig");
    },
    {
      message:
        "engine.roundConfig: null/NA requires engine.notApplicableReasons.roundConfig â€” " +
        "explain why (e.g. 'Animals is played in a single session until all pairs are matched; there are no discrete rounds.')",
      path: ["engine", "roundConfig"],
    }
  )
  .refine(
    (g) => {
      if (g.history.hasPlaceholders || g.history.evolution !== null) return true;
      return requireNullReason(g.history, "evolution");
    },
    {
      message:
        "history.evolution: null requires history.nullReasons.evolution when hasPlaceholders=false â€” " +
        "e.g. 'No documented evolutionary changes; game emerged as a stable folk tradition.'",
      path: ["history", "evolution"],
    }
  )
  .refine(
    (g) => {
      if (g.history.hasPlaceholders || g.history.cultural !== null) return true;
      return requireNullReason(g.history, "cultural");
    },
    {
      message:
        "history.cultural: null requires history.nullReasons.cultural when hasPlaceholders=false â€” " +
        "e.g. 'No specific cultural or regional significance documented beyond its folk origins.'",
      path: ["history", "cultural"],
    }
  )
  .refine(
    (g) => {
      if (g.strategy.hasPlaceholders || g.strategy.basic !== null) return true;
      return requireNullReason(g.strategy, "basic");
    },
    {
      message:
        "strategy.basic: null requires strategy.nullReasons.basic when hasPlaceholders=false â€” " +
        "e.g. 'Animals is a pure memory game; strategy consists only of remembering card positions.'",
      path: ["strategy", "basic"],
    }
  )
  .refine(
    (g) => {
      if (g.strategy.hasPlaceholders || g.strategy.intermediate !== null) return true;
      return requireNullReason(g.strategy, "intermediate");
    },
    {
      message:
        "strategy.intermediate: null requires strategy.nullReasons.intermediate when hasPlaceholders=false â€” " +
        "e.g. 'No distinct intermediate level exists; the game scales only with memory capacity.'",
      path: ["strategy", "intermediate"],
    }
  )
  .refine(
    (g) => {
      if (g.strategy.hasPlaceholders || g.strategy.advanced !== null) return true;
      return requireNullReason(g.strategy, "advanced");
    },
    {
      message:
        "strategy.advanced: null requires strategy.nullReasons.advanced when hasPlaceholders=false â€” " +
        "e.g. 'No advanced strategy beyond perfect memorization; the game is not deep enough for a dedicated advanced tier.'",
      path: ["strategy", "advanced"],
    }
  )
  .refine(
    (g) => {
      if (g.ai.hasPlaceholders || g.ai.difficulty.easy !== null) return true;
      return requireNullReason(g.ai, "easy");
    },
    {
      message:
        "ai.difficulty.easy: null requires ai.nullReasons.easy when hasPlaceholders=false â€” " +
        "e.g. 'Easy AI flips cards at random with no memory tracking.'",
      path: ["ai", "difficulty", "easy"],
    }
  )
  .refine(
    (g) => {
      if (g.ai.hasPlaceholders || g.ai.difficulty.medium !== null) return true;
      return requireNullReason(g.ai, "medium");
    },
    {
      message:
        "ai.difficulty.medium: null requires ai.nullReasons.medium when hasPlaceholders=false â€” " +
        "e.g. 'No distinct medium tier; all non-easy AI plays at full memory recall.'",
      path: ["ai", "difficulty", "medium"],
    }
  )
  .refine(
    (g) => {
      if (g.ai.hasPlaceholders || g.ai.difficulty.hard !== null) return true;
      return requireNullReason(g.ai, "hard");
    },
    {
      message:
        "ai.difficulty.hard: null requires ai.nullReasons.hard when hasPlaceholders=false â€” " +
        "e.g. 'Hard AI maintains perfect recall of all flipped cards throughout the game.'",
      path: ["ai", "difficulty", "hard"],
    }
  )
  .refine(
    (g) => {
      if (g.scoring.hasPlaceholders) return true;
      const ts = g.scoring.targetScore;
      const isAbsent = ts === null || (typeof ts === "string");
      if (!isAbsent) return true;
      return requireNullReason(g.scoring, "targetScore");
    },
    {
      message:
        "scoring.targetScore: null/NA requires scoring.nullReasons.targetScore when hasPlaceholders=false â€” " +
        "e.g. 'No fixed target score; play ends when all pairs are collected and winner has the most pairs.'",
      path: ["scoring", "targetScore"],
    }
  )
  .refine(
    (g) => {
      if (g.scoring.hasPlaceholders || g.scoring.scoringDirection !== null) return true;
      return requireNullReason(g.scoring, "scoringDirection");
    },
    {
      message:
        "scoring.scoringDirection: null requires scoring.nullReasons.scoringDirection when hasPlaceholders=false â€” " +
        "e.g. 'Scoring direction is not applicable; the player with the most pairs simply wins.'",
      path: ["scoring", "scoringDirection"],
    }
  );

export type Game = z.output<typeof _GameSchemaInner>;
