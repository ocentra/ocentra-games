#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROCESSED = join(ROOT, "processed-games");
const SOURCE_HTML = join(ROOT, "SourceHtml");
const MANIFEST_PATH = join(SOURCE_HTML, "manifest.json");

const DRY_RUN = process.argv.includes("--dry-run");

function slug(url: string): string {
  try {
    const u = new URL(url);
    const base = (u.pathname.replace(/^\//, "") || u.hostname).replace(/[^a-zA-Z0-9._-]/g, "_");
    return base + "_" + Buffer.from(url).toString("base64url").slice(0, 12);
  } catch {
    return Buffer.from(url).toString("base64url").slice(0, 32);
  }
}

function normalizeUrl(u: string): string {
  try {
    const x = new URL(u);
    return x.origin + (x.pathname.replace(/\/$/, "") || "/");
  } catch {
    return u;
  }
}

function buildUrlToHtmlFiles(): Map<string, string[]> {
  const sourceHtmlFiles = new Set<string>(readdirSync(SOURCE_HTML).filter((f: string) => f.endsWith(".html")));
  const urlToHtmlFiles = new Map<string, string[]>();

  const addMapping = (normUrl: string, file: string): void => {
    if (!sourceHtmlFiles.has(file)) return;
    if (!urlToHtmlFiles.has(normUrl)) urlToHtmlFiles.set(normUrl, []);
    if (!urlToHtmlFiles.get(normUrl)!.includes(file)) urlToHtmlFiles.get(normUrl)!.push(file);
  };

  if (!existsSync(MANIFEST_PATH)) return urlToHtmlFiles;
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Record<string, string | Record<string, string>>;

  for (const [file, url] of Object.entries(manifest)) {
    if (file === "_redirects" || !url || typeof url !== "string") continue;
    const n = normalizeUrl(url);
    addMapping(n, file);
    if (/pagat\.com/i.test(url)) {
      const alt = n.replace(/\/schafk\//, "/schafkopf/").replace(/\/schafkopf\//, "/schafk/");
      if (alt !== n) addMapping(alt, file);
      const alt2 = n.replace(/\/quotawhist\//, "/whist/").replace(/\/whist\//, "/quotawhist/");
      if (alt2 !== n) addMapping(alt2, file);
    }
    if (/catsatcards\.com/i.test(url)) {
      const altCat = n.replace(/^https:\/\/www\./, "https://").replace(/^https:\/\/(?!www\.)/, "https://www.");
      if (altCat !== n) addMapping(altCat, file);
    }
    if (/wikipedia\.org/i.test(url) && /\/wiki\/List_of_poker_variants$/i.test(n)) {
      addMapping(n.replace(/List_of_poker_variants/i, "Poker_variants"), file);
    }
    if (/wikipedia\.org/i.test(url) && /\/wiki\/Poker_variants$/i.test(n)) {
      addMapping(n.replace(/Poker_variants/i, "List_of_poker_variants"), file);
    }
  }

  const redirects = (manifest as { _redirects?: Record<string, string> })._redirects || {};
  for (const [redirectUrl, file] of Object.entries(redirects)) {
    addMapping(normalizeUrl(redirectUrl), file);
  }

  return urlToHtmlFiles;
}

function findLocalHtml(url: string, urlToHtmlFiles: Map<string, string[]>): string | null {
  const n = normalizeUrl(url);
  if (urlToHtmlFiles.has(n)) {
    const files = urlToHtmlFiles.get(n)!;
    return files[0];
  }
  const slugFile = slug(url) + ".html";
  const sourceHtmlFiles = new Set<string>(readdirSync(SOURCE_HTML).filter((f: string) => f.endsWith(".html")));
  if (sourceHtmlFiles.has(slugFile)) return slugFile;
  return null;
}

interface SourcePrimary {
  url?: string;
  localHtml?: string;
}

interface SourceAdditional {
  url?: string;
  localHtml?: string;
}

interface GameSources {
  primary?: SourcePrimary[];
  additional?: (string | SourceAdditional)[];
}

const urlToHtmlFiles = buildUrlToHtmlFiles();
const jsonFiles = readdirSync(PROCESSED).filter((f: string) => f.endsWith(".json"));

let updated = 0;
let touched = 0;

for (const jsonFile of jsonFiles) {
  const filePath = join(PROCESSED, jsonFile);
  const raw = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error(`Skip ${jsonFile}: invalid JSON`);
    continue;
  }

  const sources = data?.sources as GameSources | undefined;
  if (!sources) continue;

  let changed = false;

  if (sources.primary && Array.isArray(sources.primary)) {
    for (const src of sources.primary) {
      const url = src?.url;
      if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) continue;

      const localHtml = findLocalHtml(url, urlToHtmlFiles);
      if (localHtml) {
        if (src.localHtml !== localHtml) {
          src.localHtml = localHtml;
          changed = true;
        }
        touched++;
      } else if (src.localHtml !== undefined) {
        delete src.localHtml;
        changed = true;
      }
    }
  }

  if (sources.additional && Array.isArray(sources.additional)) {
    for (let i = 0; i < sources.additional.length; i++) {
      const entry = sources.additional[i];
      let url: string | undefined;
      let isObj = false;
      if (typeof entry === "object" && entry !== null && typeof (entry as SourceAdditional).url === "string") {
        url = (entry as SourceAdditional).url;
        isObj = true;
      } else if (typeof entry === "string" && /^https?:\/\//.test(entry.trim())) {
        url = entry.trim();
      } else {
        continue;
      }
      if (!url) continue;

      const localHtml = findLocalHtml(url, urlToHtmlFiles);
      if (localHtml) {
        if (!isObj) {
          sources.additional[i] = { url, localHtml };
          changed = true;
        } else if ((entry as SourceAdditional).localHtml !== localHtml) {
          (entry as SourceAdditional).localHtml = localHtml;
          changed = true;
        }
        touched++;
      } else if (isObj && (entry as SourceAdditional).localHtml !== undefined) {
        delete (entry as SourceAdditional).localHtml;
        changed = true;
      }
    }
  }

  if (changed && !DRY_RUN) {
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
    updated++;
  } else if (changed) {
    updated++;
  }
}

console.error(`Enriched ${touched} sources across ${updated} JSON files${DRY_RUN ? " (dry-run)" : ""}`);
