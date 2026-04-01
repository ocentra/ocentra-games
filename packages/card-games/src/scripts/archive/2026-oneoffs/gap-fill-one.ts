#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { GameSchema } from "@/schema/zod/game-schema";

const file = process.argv[2];
if (!file) {
  console.error('Usage: node gap-fill-one.ts <file.json>');
  process.exit(1);
}

let data: Record<string, unknown>;
try {
  data = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
} catch (e) {
  console.error('Failed to read:', file, (e as Error).message);
  process.exit(1);
}

interface PlayerRange {
  minPlayers: number;
  maxPlayers: number;
  recommendedPlayers: number | null;
  display: string;
}

function parsePlayerRange(s: unknown): PlayerRange {
  if (typeof s === 'object' && s !== null && 'minPlayers' in s && (s as { minPlayers: unknown }).minPlayers != null) {
    return s as unknown as PlayerRange;
  }
  const m = String(s).match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (m) return { minPlayers: +m[1], maxPlayers: +m[2], recommendedPlayers: null, display: String(s) };
  const n = String(s).match(/^(\d+)$/);
  if (n) return { minPlayers: +n[1], maxPlayers: +n[1], recommendedPlayers: +n[1], display: String(s) };
  const multi = String(s).match(/(\d+)[,\s]+(\d+)[,\s]+or\s+(\d+)/i);
  if (multi) return { minPlayers: +multi[1], maxPlayers: +multi[3], recommendedPlayers: +multi[2], display: String(s) };
  return { minPlayers: 2, maxPlayers: 6, recommendedPlayers: 4, display: String(s) };
}

if (!data.schemaVersion) data.schemaVersion = 'processed-game@1.0.0';
if (!data.engineModelVersion) data.engineModelVersion = 'engine-blueprint@1.0.0';

const overview = data.overview as Record<string, unknown> | undefined;
if (overview?.players && typeof overview.players === 'string') {
  overview.players = parsePlayerRange(overview.players);
}
if (!overview?.players || typeof overview.players !== 'object') {
  data.overview = data.overview ?? {};
  (data.overview as Record<string, unknown>).players = { minPlayers: 2, maxPlayers: 6, recommendedPlayers: 4, display: '2-6' };
}

if (overview?.difficulty === 'Unknown') overview.difficulty = 'Intermediate';

const sources = data.sources as { primary?: Array<Record<string, unknown>> } | undefined;
if (sources?.primary) {
  for (const p of sources.primary) {
    if (p.id === 'Unknown' && p.url) {
      const url = String(p.url);
      const pagat = url.match(/pagat\.com\/(?:[^/]+\/)?([^.#/]+)/);
      const wiki = url.match(/wikipedia\.org\/wiki\/([^?#]+)/);
      if (pagat) p.id = 'src:pagat-' + pagat[1].toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '');
      else if (wiki) p.id = 'src:wikipedia-' + wiki[1].toLowerCase().replace(/[()]/g, '').replace(/_/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
      else p.id = 'src:pagat-' + path.basename(file, '.json').toLowerCase();
    }
    if (p.id && (/[A-Z_()]/.test(String(p.id)) || p.id === 'Unknown')) {
      let clean = String(p.id).replace(/^src:/, '').toLowerCase();
      clean = clean.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^_|_$/g, '').slice(0, 60);
      p.id = clean ? 'src:' + clean : 'src:unknown';
    }
    if (!p.retrievedAt) p.retrievedAt = '2026-02-21';
  }
}

const validActors = ['each_player_clockwise', 'each_player_counterclockwise', 'dealer', 'all_simultaneous', 'active_players_clockwise', 'active_players_counterclockwise', 'current_player', 'winning_player', 'system'];
const actorMap: Record<string, string> = { players: 'each_player_clockwise', all: 'each_player_clockwise', each_player: 'each_player_clockwise' };
const engine = data.engine as { phases?: Array<{ actor?: string }> } | undefined;
if (engine?.phases) {
  for (const ph of engine.phases) {
    if (ph.actor && !validActors.includes(ph.actor) && !ph.actor.startsWith('role:') && !ph.actor.startsWith('custom:')) {
      ph.actor = actorMap[ph.actor] ?? 'each_player_clockwise';
    }
  }
}

const EFFECT_MAP: Record<string, string> = { play_card: 'play', deal: 'deal', draw: 'draw', discard: 'discard', pass: 'pass', bid: 'bid' };
const engineData = data.engine as { phases?: Array<{ legalActions?: string[] }>; playerActions?: Record<string, Record<string, unknown>> } | undefined;
if (engineData?.playerActions) {
  const usedActions = new Set<string>();
  for (const ph of engineData.phases ?? []) {
    for (const a of ph.legalActions ?? []) usedActions.add(String(a));
  }
  for (const [key, act] of Object.entries(engineData.playerActions)) {
    const hasContent = act.description && !String(act.description).match(/^(NA|not applicable)$/i);
    const isUsed = usedActions.has(key);
    if (act.supported === false) {
      act.description = 'NA';
      act.cost = 'NA';
      act.constraints = 'NA';
      act.effectType = 'NA';
    } else if ((act.supported === true || hasContent || isUsed) && (act.effectType === 'Unknown' || act.effectType === 'NA' || !act.effectType)) {
      if (hasContent || isUsed) {
        act.supported = true;
        act.effectType = (EFFECT_MAP[key] ?? 'play') as string;
        if (!act.constraints || act.constraints === 'NA') act.constraints = (act.description as string) ?? 'As per rules.';
        if (act.cost === 'NA') act.cost = '0';
      }
    }
  }
}

const engineWithHandRanks = engineData as { handRanks?: { high?: string; low?: string } | null };
const handRanks = engineWithHandRanks?.handRanks;
if (handRanks && typeof handRanks === 'object' && !Array.isArray(handRanks) && (handRanks.high === 'Unknown' || handRanks.low === 'Unknown')) {
  (engineData as Record<string, unknown>).handRanks = null;
}

const parsed = GameSchema.safeParse(data);
if (!parsed.success) {
  console.error("Validation failed – not writing. Fix game JSON to match schema:");
  for (const e of parsed.error.issues) {
    console.error(`  ${e.path.join(".")}: ${e.message}`);
  }
  process.exit(1);
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log("Gap-filled:", file);
