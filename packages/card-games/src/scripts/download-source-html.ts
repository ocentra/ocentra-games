#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PAGAT_TXT = path.join(ROOT, "schema", "game_names_pagat.txt");
const SOURCE_HTML_DIR = path.join(ROOT, "SourceHtml");
const URLS_FILE = path.join(ROOT, "urls-deduplicated.txt");

const URL_IN_LINE = /https?:\/\/[^\s]+/g;
const LINE_PARTS = /:\s*(card-games\/processed-games\/[^:]+\.json)\s*:\s*(https?:\/\/\S+)/;

(async (): Promise<void> => {
  const urls = new Set<string>();
  const urlToJson = new Map<string, string>();
  for (const line of fs.readFileSync(PAGAT_TXT, "utf-8").split("\n")) {
    const parts = line.match(LINE_PARTS);
    const jsonPath = parts ? path.join(ROOT, "processed-games", path.basename(parts[1])) : null;
    const m = line.match(URL_IN_LINE);
    if (m) {
      for (const u of m) {
        const url = u.replace(/[\s,]+$/, "").trim();
        urls.add(url);
        if (jsonPath && !urlToJson.has(url)) urlToJson.set(url, jsonPath);
      }
    }
  }

  function getUrlsFromJson(jsonPath: string): string[] {
    try {
      const raw = fs.readFileSync(jsonPath, "utf-8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw) as Record<string, unknown>;
      const out: string[] = [];
      for (const p of (data?.sources as { primary?: Array<{ url?: string }> })?.primary ?? []) {
        if (p?.url) out.push(p.url.trim());
      }
      for (const a of (data?.sources as { additional?: (string | { url?: string })[] })?.additional ?? []) {
        if (typeof a === "string" && /^https?:\/\//.test(a.trim())) out.push(a.trim());
      }
      return out;
    } catch {
      return [];
    }
  }

  const list = [...urls].sort();
  console.log(`${list.length} unique URLs`);

  fs.mkdirSync(SOURCE_HTML_DIR, { recursive: true });
  fs.writeFileSync(URLS_FILE, list.join("\n") + "\n", "utf-8");

  function slug(url: string): string {
    try {
      const u = new URL(url);
      const base = (u.pathname.replace(/^\//, "") || u.hostname).replace(/[^a-zA-Z0-9._-]/g, "_");
      return base + "_" + Buffer.from(url).toString("base64url").slice(0, 12);
    } catch {
      return Buffer.from(url).toString("base64url").slice(0, 32);
    }
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < list.length; i++) {
    const url = list[i];
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(
        path.join(SOURCE_HTML_DIR, slug(url) + ".html"),
        await res.text(),
        "utf-8"
      );
      ok++;
      process.stdout.write(`\r[${i + 1}/${list.length}] OK`);
    } catch (e) {
      fail++;
      let recovered = false;
      const jsonPath = urlToJson.get(url);
      if (jsonPath && fs.existsSync(jsonPath)) {
        const altUrls = getUrlsFromJson(jsonPath).filter((u) => u !== url);
        for (const alt of altUrls) {
          try {
            const r = await fetch(alt, {
              headers: { "User-Agent": "Mozilla/5.0" },
              redirect: "follow",
            });
            if (r.ok) {
              fs.writeFileSync(
                path.join(SOURCE_HTML_DIR, slug(alt) + ".html"),
                await r.text(),
                "utf-8"
              );
              ok++;
              console.error(`\nFAIL ${url}: ${(e as Error).message} → JSON has OK URL: ${alt}`);
              recovered = true;
              break;
            }
          } catch {
            void 0;
          }
        }
      }
      if (!recovered) console.error(`\nFAIL ${url}: ${(e as Error).message}`);
    }
  }
  console.log(`\nDone. OK: ${ok}, Failed: ${fail}`);
})();
