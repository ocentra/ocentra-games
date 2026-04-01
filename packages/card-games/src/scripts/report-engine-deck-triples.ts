#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { PROCESSED_GAMES_DIR } from "@/paths";
import { GameSchema, type Game } from "@/schema/zod/game-schema";

type TripleKey = `${string}\0${string}\0${string}`;

function tripleKey(deckType: string, suitSet: string, rankSet: string): TripleKey {
  return `${deckType}\0${suitSet}\0${rankSet}`;
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const limit = (() => {
    const idx = process.argv.findIndex((a) => a === "--limit");
    if (idx === -1) return 30;
    const v = Number(process.argv[idx + 1]);
    return Number.isFinite(v) ? v : 30;
  })();

  const includeExamples = args.has("--examples");

  const files = fs.readdirSync(PROCESSED_GAMES_DIR).filter((f) => f.endsWith(".json"));
  const counts = new Map<TripleKey, number>();
  const deckCountCounts = new Map<string, number>();
  const jokerCountCounts = new Map<string, number>();
  const examples = new Map<TripleKey, string[]>();
  let invalid = 0;
  let skippedCommercialGames = 0;

  for (const f of files) {
    const abs = path.join(PROCESSED_GAMES_DIR, f);
    const raw = readJson(abs);
    const parsed = GameSchema.safeParse(raw);
    if (!parsed.success) {
      invalid++;
      continue;
    }
    const g: Game = parsed.data;
    if (g.legal.isCommercial) {
      skippedCommercialGames++;
      continue;
    }
    const e = g.engine;
    const key = tripleKey(e.deckType, e.suitSet, e.rankSet);
    counts.set(key, (counts.get(key) ?? 0) + 1);

    const deckCount = e.deckCount == null ? "null" : String(e.deckCount);
    deckCountCounts.set(deckCount, (deckCountCounts.get(deckCount) ?? 0) + 1);

    const jokerCount = e.jokerCount == null ? "null" : String(e.jokerCount);
    jokerCountCounts.set(jokerCount, (jokerCountCounts.get(jokerCount) ?? 0) + 1);

    if (includeExamples) {
      const arr = examples.get(key) ?? [];
      if (arr.length < 5) arr.push(f);
      examples.set(key, arr);
    }
  }

  const topTriples = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k, n]) => {
      const [deckType, suitSet, rankSet] = k.split("\0");
      return {
        deckType,
        suitSet,
        rankSet,
        count: n,
        examples: includeExamples ? (examples.get(k) ?? []) : undefined,
      };
    });

  const topDeckCounts = [...deckCountCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topJokerCounts = [...jokerCountCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const output = {
    processedGames: files.length,
    nonCommercialProcessedGames: files.length - invalid - skippedCommercialGames,
    invalidGames: invalid,
    skippedCommercialGames,
    topTriples,
    deckCountDistribution: topDeckCounts.map(([value, count]) => ({ value, count })),
    jokerCountDistribution: topJokerCounts.map(([value, count]) => ({ value, count })),
  };

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}

main();

