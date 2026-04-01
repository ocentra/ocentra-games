#!/usr/bin/env node

import fs from "fs";
import { GameSchema, type Game } from "@/schema/zod/game-schema";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx src/scripts/inspect-game.ts <path-to-game.json>");
  process.exit(1);
}
const raw = fs.readFileSync(file, "utf-8");
const json = JSON.parse(raw);

const result = GameSchema.safeParse(json);
if (!result.success) {
  console.error("Validation failed:", result.error.issues);
  process.exit(1);
}

const game: Game = result.data;
console.log(JSON.stringify(game, null, 2));
