#!/usr/bin/env node

import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { walkProcessedGameFiles, type ProcessedGameFile } from "../processed-game-files";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MANIFEST = join(ROOT, "SourceHtml", "manifest.json");
const PROCESSED = join(ROOT, "processed-games");
const GAME_NAMES = join(ROOT, "schema", "game_names_pagat.txt");
const processedFiles = walkProcessedGameFiles(PROCESSED);
const processedByRelativePath = new Map(processedFiles.map((entry) => [entry.relativePath.toLowerCase(), entry]));
const processedByFileName = new Map(processedFiles.map((entry) => [entry.fileName.toLowerCase(), entry]));

function normalize(u: string): string {
  try {
    const x = new URL(u);
    return (x.origin + x.pathname.replace(/\/$/, "") || x.origin + "/").toLowerCase();
  } catch {
    return String(u).toLowerCase();
  }
}

const manifestUrls = new Map<string, string[]>();
const manifestNormToOriginal = new Map<
  string,
  { file: string; url: string }
>();
if (existsSync(MANIFEST)) {
  const m = JSON.parse(readFileSync(MANIFEST, "utf8")) as Record<string, string | Record<string, string>>;
  for (const [file, url] of Object.entries(m)) {
    if (file === "_redirects" || !url || typeof url !== "string") continue;
    const n = normalize(url);
    if (!manifestUrls.has(n)) manifestUrls.set(n, []);
    manifestUrls.get(n)!.push(file);
    if (!manifestNormToOriginal.has(n)) manifestNormToOriginal.set(n, { file, url });
  }
  const redirects = (m._redirects || {}) as Record<string, string>;
  for (const [url, file] of Object.entries(redirects)) {
    const n = normalize(url);
    if (!manifestUrls.has(n)) manifestUrls.set(n, []);
    manifestUrls.get(n)!.push(file);
    if (!manifestNormToOriginal.has(n)) manifestNormToOriginal.set(n, { file, url });
  }
}

const urlToJson = new Map<string, Set<string>>();
const URL_RE = /https?:\/\/[^\s|]+/g;
const LINE_RE = /^([^#\s].+?)\s*:\s*card-games\/processed-games\/([^\s:]+\.json)\s*:\s*(.+)$/;

function resolveProcessedGameFile(jsonFile: string): ProcessedGameFile | null {
  const normalized = jsonFile.replace(/\\/g, "/").replace(/^card-games\/processed-games\//, "");
  return processedByRelativePath.get(normalized.toLowerCase()) ?? processedByFileName.get(normalized.split("/").pop()!.toLowerCase()) ?? null;
}

function addUrlToJson(n: string, jsonFile: string | ProcessedGameFile): void {
  const entry = typeof jsonFile === "string" ? resolveProcessedGameFile(jsonFile) : jsonFile;
  if (entry === null) return;
  if (!urlToJson.has(n)) urlToJson.set(n, new Set());
  urlToJson.get(n)!.add(entry.relativePath);
}

for (const line of readFileSync(GAME_NAMES, "utf8").split("\n")) {
  const m = line.match(LINE_RE);
  if (!m) continue;
  const [, , jsonFile, urlPart] = m;
  for (const u of urlPart!.match(URL_RE) || []) {
    const url = u.replace(/[\s,]+$/, "").trim();
    const n = normalize(url);
    addUrlToJson(n, jsonFile!);
    if (/pagat\.com/i.test(url)) {
      const alt = n.replace(/\/schafk\//, "/schafkopf/").replace(/\/schafkopf\//, "/schafk/");
      const alt2 = n.replace(/\/quotawhist\//, "/whist/").replace(/\/whist\//, "/quotawhist/");
      if (alt !== n) addUrlToJson(alt, jsonFile!);
      if (alt2 !== n) addUrlToJson(alt2, jsonFile!);
    }
    if (/catsatcards\.com/i.test(url)) {
      const alt = n.replace(/^https:\/\/www\./, "https://").replace(/^https:\/\/(?!www\.)/, "https://www.");
      if (alt !== n) addUrlToJson(alt, jsonFile!);
    }
  }
}

function getUrlsFromJson(jsonFile: string): string[] {
  const entry = resolveProcessedGameFile(jsonFile);
  if (entry === null) return [];
  try {
    const raw = readFileSync(entry.absolutePath, "utf8").replace(/^\uFEFF/, "");
    const data = JSON.parse(raw) as Record<string, unknown>;
    const out: string[] = [];
    const primary = (data?.sources as { primary?: Array<{ url?: string }> })?.primary ?? [];
    for (const p of primary) {
      const u = p?.url?.trim();
      if (u && /^https?:\/\//.test(u) && !u.startsWith("https://example.com")) out.push(u);
    }
    const additional = (data?.sources as { additional?: (string | { url?: string })[] })?.additional ?? [];
    for (const a of additional) {
      if (typeof a === "string" && /^https?:\/\//.test(a.trim())) out.push(a.trim());
      if (a && typeof a === "object" && typeof (a as { url?: string }).url === "string" && /^https?:\/\//.test((a as { url: string }).url.trim()))
        out.push((a as { url: string }).url.trim());
    }
    return out;
  } catch {
    return [];
  }
}

for (const f of processedFiles) {
  for (const u of getUrlsFromJson(f.relativePath)) {
    const n = normalize(u);
    addUrlToJson(n, f);
    if (/pagat\.com/i.test(u)) {
      const alt = n.replace(/\/schafk\//, "/schafkopf/").replace(/\/schafkopf\//, "/schafk/");
      const alt2 = n.replace(/\/quotawhist\//, "/whist/").replace(/\/whist\//, "/quotawhist/");
      if (alt !== n) addUrlToJson(alt, f);
      if (alt2 !== n) addUrlToJson(alt2, f);
    }
    if (/catsatcards\.com/i.test(u)) {
      const alt = n.replace(/^https:\/\/www\./, "https://").replace(/^https:\/\/(?!www\.)/, "https://www.");
      if (alt !== n) addUrlToJson(alt, f);
    }
  }
}

function manifestUrlCovered(normUrl: string): boolean {
  if (urlToJson.has(normUrl)) return true;
  if (/pagat\.com/i.test(normUrl)) {
    const alt = normUrl.replace(/\/schafk\//, "/schafkopf/").replace(/\/schafkopf\//, "/schafk/");
    const alt2 = normUrl.replace(/\/quotawhist\//, "/whist/").replace(/\/whist\//, "/quotawhist/");
    if (urlToJson.has(alt) || urlToJson.has(alt2)) return true;
  }
  if (/catsatcards\.com/i.test(normUrl)) {
    const alt = normUrl.replace(/^https:\/\/www\./, "https://").replace(/^https:\/\/(?!www\.)/, "https://www.");
    if (urlToJson.has(alt)) return true;
  }
  return false;
}

interface OrphanInfo {
  file: string;
  url: string;
}

const manifestOrphans: OrphanInfo[] = [];
const covered = new Set<string>();

for (const [normUrl, files] of manifestUrls) {
  if (manifestUrlCovered(normUrl)) {
    covered.add(normUrl);
  } else {
    const info = manifestNormToOriginal.get(normUrl) || { file: files[0], url: normUrl };
    manifestOrphans.push({ file: info.file, url: info.url });
  }
}

function manifestHasUrl(normUrl: string): boolean {
  if (manifestUrls.has(normUrl)) return true;
  if (/pagat\.com/i.test(normUrl)) {
    const alt = normUrl.replace(/\/schafk\//, "/schafkopf/").replace(/\/schafkopf\//, "/schafk/");
    const alt2 = normUrl.replace(/\/quotawhist\//, "/whist/").replace(/\/whist\//, "/quotawhist/");
    if (manifestUrls.has(alt) || manifestUrls.has(alt2)) return true;
  }
  if (/catsatcards\.com/i.test(normUrl)) {
    const alt = normUrl.replace(/^https:\/\/www\./, "https://").replace(/^https:\/\/(?!www\.)/, "https://www.");
    if (manifestUrls.has(alt)) return true;
  }
  return false;
}

interface JsonUrlWithoutHtml {
  url: string;
  jsonExamples: string[];
}

const jsonUrlsWithoutHtml: JsonUrlWithoutHtml[] = [];
for (const n of urlToJson.keys()) {
  if (!manifestHasUrl(n)) {
    const examples = [...urlToJson.get(n)!].slice(0, 2);
    jsonUrlsWithoutHtml.push({ url: n, jsonExamples: examples });
  }
}

console.log("=== Manifest vs JSON overlap ===\n");
console.log(`Manifest URLs (HTML we have): ${manifestUrls.size}`);
console.log(`JSON-referenced URLs: ${urlToJson.size}`);
console.log(`Manifest URLs covered by JSON: ${covered.size}`);
console.log("");

if (manifestOrphans.length > 0) {
  console.log(`ORPHAN HTML (${manifestOrphans.length}): We have HTML but NO JSON references this URL:`);
  console.log("  → Possible new games to create JSON for, or variant pages\n");
  for (const { file, url } of manifestOrphans.slice(0, 30)) {
    console.log(`  ${file}`);
    console.log(`    ${url}`);
  }
  if (manifestOrphans.length > 30) {
    console.log(`  ... and ${manifestOrphans.length - 30} more`);
  }
  console.log("");
}

console.log(`JSON URLs WITHOUT local HTML: ${jsonUrlsWithoutHtml.length}`);
console.log("  (Build uses fuzzy title-matching too; game-checklist may show ✓ for some)");
if (jsonUrlsWithoutHtml.length > 0 && jsonUrlsWithoutHtml.length <= 50) {
  console.log("  (First 20:)");
  for (const { url, jsonExamples } of jsonUrlsWithoutHtml.slice(0, 20)) {
    console.log(`  ${url}`);
    console.log(`    → ${jsonExamples.join(", ")}`);
  }
} else if (jsonUrlsWithoutHtml.length > 50) {
  console.log("  (Sample - run script to see full list)");
  for (const { url, jsonExamples } of jsonUrlsWithoutHtml.slice(0, 10)) {
    console.log(`  ${url} → ${jsonExamples[0]}`);
  }
}

const indexLike =
  /\/index\.html?$|\/(com|domino|fishing|banking|allfours|adders|beating|auctionwhist|boston|rams|patience|climbing|tarot)\/$|\/line\/$|\/cross\/$|^\/pas-seul\/$/i;
const likelyNewGames = manifestOrphans.filter((o) => !indexLike.test(o.url));
console.log("");
console.log(`ORPHAN HTML that look like individual game pages (excl. index/category): ${likelyNewGames.length}`);
console.log("  → These are candidates for new JSON if they describe distinct games.");
if (likelyNewGames.length > 0 && likelyNewGames.length <= 25) {
  for (const { file, url } of likelyNewGames.slice(0, 25)) {
    console.log(`  ${file} | ${url}`);
  }
} else if (likelyNewGames.length > 25) {
  for (const { file, url } of likelyNewGames.slice(0, 15)) {
    console.log(`  ${file} | ${url}`);
  }
  console.log(`  ... and ${likelyNewGames.length - 15} more`);
}

const ORPHAN_OUT = join(ROOT, "manifest-orphans.txt");
const LIKELY_NEW_OUT = join(ROOT, "manifest-likely-new-games.txt");
writeFileSync(ORPHAN_OUT, manifestOrphans.map((o) => `${o.file}\t${o.url}`).join("\n") + "\n", "utf8");
writeFileSync(LIKELY_NEW_OUT, likelyNewGames.map((o) => `${o.file}\t${o.url}`).join("\n") + "\n", "utf8");
console.log("");
console.log(`Wrote ${ORPHAN_OUT}`);
console.log(`Wrote ${LIKELY_NEW_OUT}`);
