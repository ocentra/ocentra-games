#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const GAME_NAMES = join(ROOT, "src", "schema", "game_names_pagat.txt");
const CHECKLIST = join(ROOT, "gap_fill_and_verify.md");
const PROCESSED = join(ROOT, "src", "processed-games");
const SOURCE_HTML = join(ROOT, "src", "SourceHtml");
const OUTPUT = join(ROOT, "game-checklist.md");
function slug(url) {
    try {
        const u = new URL(url);
        const base = (u.pathname.replace(/^\//, "") || u.hostname).replace(/[^a-zA-Z0-9._-]/g, "_");
        return base + "_" + Buffer.from(url).toString("base64url").slice(0, 12);
    }
    catch {
        return Buffer.from(url).toString("base64url").slice(0, 32);
    }
}
function isGenericUrl(url) {
    try {
        const u = new URL(url);
        const path = u.pathname.replace(/\/$/, "") || "/";
        const pathLower = path.toLowerCase();
        if (/pagat\.com$/i.test(u.hostname) && (path === "/" || path === "" || /^\/index\.html?$/i.test(path)))
            return true;
        if (/wikipedia\.org/i.test(u.hostname) && /\/wiki\/List_of/i.test(pathLower))
            return true;
        if (/boardgamegeek\.com$/i.test(u.hostname) && (path === "/" || path === ""))
            return true;
        if (/bicyclecards\.com/i.test(u.hostname) && (path === "/" || path === "" || /^\/how-to-play\/?$/i.test(pathLower)))
            return true;
    }
    catch {
        void 0;
    }
    return false;
}
function stripSee(name) {
    return name.replace(/\s*\(see [^)]+\)\s*$/i, "").trim();
}
function primaryName(jsonFile, names) {
    const base = jsonFile.replace(".json", "").replace(/-/g, " ");
    const title = base.replace(/\b\w/g, (c) => c.toUpperCase());
    const arr = [...names];
    const exact = arr.find((n) => n.toLowerCase() === title.toLowerCase());
    if (exact)
        return exact;
    const partial = arr.find((n) => n.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .includes(jsonFile.replace(".json", "").toLowerCase()));
    if (partial)
        return partial;
    return arr.sort((a, b) => a.localeCompare(b))[0];
}
function sectionKey(primary) {
    const first = primary.trim().charAt(0);
    if (/[A-Za-z]/.test(first))
        return first.toUpperCase();
    if (/[0-9]/.test(first))
        return "0";
    return "9";
}
const existingJson = new Set(readdirSync(PROCESSED).filter((f) => f.endsWith(".json")));
const sourceHtmlFiles = existsSync(SOURCE_HTML)
    ? new Set(readdirSync(SOURCE_HTML).filter((f) => f.endsWith(".html")))
    : new Set();
const MANIFEST_PATH = join(ROOT, "src", "SourceHtml", "manifest.json");
const urlToHtmlFiles = new Map();
if (existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    const normalize = (u) => {
        try {
            const x = new URL(u);
            return x.origin + x.pathname.replace(/\/$/, "") || x.origin + "/";
        }
        catch {
            return u;
        }
    };
    const addMapping = (normUrl, file) => {
        if (!urlToHtmlFiles.has(normUrl))
            urlToHtmlFiles.set(normUrl, []);
        if (!urlToHtmlFiles.get(normUrl).includes(file))
            urlToHtmlFiles.get(normUrl).push(file);
    };
    for (const [file, url] of Object.entries(manifest)) {
        if (file === "_redirects" || !url)
            continue;
        const n = normalize(url);
        addMapping(n, file);
        if (/pagat\.com/i.test(url)) {
            const alt = n.replace(/\/schafk\//, "/schafkopf/").replace(/\/schafkopf\//, "/schafk/");
            if (alt !== n)
                addMapping(alt, file);
            const alt2 = n.replace(/\/quotawhist\//, "/whist/").replace(/\/whist\//, "/quotawhist/");
            if (alt2 !== n)
                addMapping(alt2, file);
        }
        if (/catsatcards\.com/i.test(url)) {
            const altCat = n.replace(/^https:\/\/www\./, "https://").replace(/^https:\/\/(?!www\.)/, "https://www.");
            if (altCat !== n)
                addMapping(altCat, file);
        }
    }
    const manifestData = manifest;
    const redirects = manifestData._redirects || {};
    for (const [redirectUrl, file] of Object.entries(redirects)) {
        addMapping(normalize(redirectUrl), file);
    }
}
const titleRe = /<title[^>]*>([^<]+)<\/title>/i;
const h1Re = /<h1[^>]*>([^<]+)<\/h1>/i;
const manifestTitleToFile = new Map();
for (const f of existsSync(SOURCE_HTML) ? readdirSync(SOURCE_HTML).filter((x) => x.endsWith(".html")) : []) {
    try {
        const raw = readFileSync(join(SOURCE_HTML, f), "utf8").slice(0, 8000);
        const m = raw.match(titleRe) || raw.match(h1Re);
        const title = m ? m[1].replace(/\s+/g, " ").trim() : "";
        if (title) {
            const n = title
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9\s]/g, " ")
                .replace(/\s+/g, " ")
                .trim();
            if (n && !manifestTitleToFile.has(n))
                manifestTitleToFile.set(n, f);
        }
    }
    catch {
        void 0;
    }
}
const byJson = new Map();
function addEntry(jsonFile, name, urls = []) {
    const base = jsonFile.replace(/^.*\//, "");
    if (!existingJson.has(base))
        return;
    if (!byJson.has(base)) {
        byJson.set(base, { names: new Set(), urls: new Set() });
    }
    const e = byJson.get(base);
    e.names.add(stripSee(name));
    for (const u of urls)
        e.urls.add(u.trim());
}
const LINE_RE = /^([^#\s].+?)\s*:\s*card-games\/processed-games\/([^\s:]+\.json)\s*:\s*(.+)$/;
const URL_RE = /https?:\/\/[^\s|]+/g;
for (const line of readFileSync(GAME_NAMES, "utf8").split("\n")) {
    const m = line.match(LINE_RE);
    if (!m)
        continue;
    const [, name, jsonFile, urlPart] = m;
    const urls = (urlPart?.match(URL_RE) || []).map((u) => u.replace(/[,\s]+$/, ""));
    addEntry(jsonFile, name, urls);
}
const CHECKLIST_RE = /^- \d+[a-z]? : \[([ x])\] (.+?) - \[([^\]]+\.json)\]\(card-games\/processed-games\/[^)]+\)$/;
for (const line of readFileSync(CHECKLIST, "utf8").split("\n")) {
    const m = line.match(CHECKLIST_RE);
    if (!m)
        continue;
    const [, , name, jsonFile] = m;
    addEntry(jsonFile, name);
}
for (const f of existingJson) {
    if (!byJson.has(f)) {
        const base = f.replace(".json", "").replace(/-/g, " ");
        const name = base.replace(/\b\w/g, (c) => c.toUpperCase());
        byJson.set(f, { names: new Set([name]), urls: new Set() });
    }
}
function getUrlsFromJson(jsonFile) {
    try {
        const raw = readFileSync(join(PROCESSED, jsonFile), "utf8").replace(/^\uFEFF/, "");
        const data = JSON.parse(raw);
        const out = [];
        for (const p of data?.sources?.primary ?? []) {
            const u = p?.url?.trim();
            if (u && /^https?:\/\//.test(u) && !u.startsWith("https://example.com"))
                out.push(u);
        }
        for (const a of data?.sources?.additional ?? []) {
            if (typeof a === "string" && /^https?:\/\//.test(a.trim()))
                out.push(a.trim());
        }
        return out;
    }
    catch {
        return [];
    }
}
for (const [jsonFile, entry] of byJson) {
    for (const u of getUrlsFromJson(jsonFile))
        entry.urls.add(u);
}
const bySection = new Map();
for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0")
    bySection.set(c, []);
for (const [jsonFile, { names, urls }] of byJson) {
    const primary = primaryName(jsonFile, names);
    const allNames = [...names].sort((a, b) => {
        if (a === primary)
            return -1;
        if (b === primary)
            return 1;
        return a.localeCompare(b);
    });
    const displayNames = allNames.join(" | ");
    const urlList = [...urls];
    const firstUrl = urlList[0] || "";
    const normalizeUrl = (u) => {
        try {
            const x = new URL(u);
            return x.origin + x.pathname.replace(/\/$/, "") || x.origin + "/";
        }
        catch {
            return u;
        }
    };
    const localHtmlFiles = new Set();
    for (const u of urlList) {
        if (isGenericUrl(u))
            continue;
        const n = normalizeUrl(u);
        if (urlToHtmlFiles.has(n)) {
            for (const f of urlToHtmlFiles.get(n)) {
                if (sourceHtmlFiles.has(f))
                    localHtmlFiles.add(f);
            }
        }
        const slugFile = slug(u) + ".html";
        if (sourceHtmlFiles.has(slugFile))
            localHtmlFiles.add(slugFile);
    }
    const hasUsefulUrl = urlList.some((u) => !isGenericUrl(u));
    if (localHtmlFiles.size === 0 && hasUsefulUrl && allNames.length > 0) {
        const norm = (s) => {
            const n = String(s)
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            return n.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
        };
        const gameWords = new Set();
        for (const n of allNames) {
            const w = norm(n)
                .split(/\s+/)
                .filter((x) => x.length > 2)
                .slice(0, 3)
                .join(" ");
            if (w)
                gameWords.add(w);
        }
        for (const [manifestTitle, file] of manifestTitleToFile) {
            if (sourceHtmlFiles.has(file) &&
                [...gameWords].some((w) => manifestTitle.includes(w) || w.split(" ").every((x) => manifestTitle.includes(x)))) {
                localHtmlFiles.add(file);
            }
        }
    }
    const key = sectionKey(primary);
    const section = key === "9" ? "0" : key;
    if (bySection.has(section)) {
        bySection.get(section).push({ jsonFile, displayNames, primary, firstUrl, localHtmlFiles, urlList });
    }
}
for (const items of bySection.values()) {
    items.sort((a, b) => a.primary.localeCompare(b.primary));
}
const out = [];
out.push("# Gap-Fill: Consolidated Checklist (TEMP)");
out.push("");
out.push("**Single source for AI context.** Game names, JSON path, URLs, local HTML status.");
out.push("**→ Read [GameReadyValidation.md](GameReadyValidation.md) for workflow and Ready Gate.**");
out.push("");
out.push("---");
out.push("");
out.push("## Format");
out.push("");
out.push("- **Names** = all aliases for this game (alsoKnownAs candidates)");
out.push("- **JSON** = canonical file in `src/processed-games/`");
out.push("- **URLs** = all sources (Pagat, Wikipedia, etc. from game_names_pagat.txt in src/schema/)");
out.push("- **Local HTML** = ✓ with file(s) if SourceHtml/ has cached copy, ✗ if needs fetch");
out.push("");
out.push("**Validation:** `npm run validate` or `npx tsx src/scripts/validate-with-ts-schema.ts src/processed-games/<id>.json [--skip-url-check]`");
out.push("");
out.push("---");
out.push("");
let num = 1;
const sectionTitles = {
    A: "### A",
    B: "### B",
    C: "### C",
    D: "### D",
    E: "### E",
    F: "### F",
    G: "### G",
    H: "### H",
    I: "### I",
    J: "### J",
    K: "### K",
    L: "### L",
    M: "### M",
    N: "### N",
    O: "### O",
    P: "### P",
    Q: "### Q",
    R: "### R",
    S: "### S",
    T: "### T",
    U: "### U",
    V: "### V",
    W: "### W",
    X: "### X",
    Y: "### Y",
    Z: "### Z",
    "0": "### 0-9",
};
for (const key of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0") {
    const items = bySection.get(key);
    if (!items || items.length === 0)
        continue;
    out.push(sectionTitles[key] || `### ${key}`);
    out.push("");
    for (const { jsonFile, displayNames, urlList, localHtmlFiles } of items) {
        const files = [...localHtmlFiles].sort();
        const htmlMark = files.length > 0 ? `✓ (${files.join(", ")})` : "✗";
        const urls = [...urlList].filter((u) => Boolean(u) && !isGenericUrl(u));
        const urlDisplay = urls.length ? urls.join(" | ") : "(none useful)";
        out.push(`- ${num} : [ ] **${displayNames}**`);
        out.push(`  - JSON: [${jsonFile}](src/processed-games/${jsonFile})`);
        out.push(`  - URLs: ${urlDisplay}`);
        out.push(`  - Local HTML: ${htmlMark}`);
        out.push("");
        num++;
    }
}
out.push("---");
out.push("");
out.push(`**Total: ${num - 1} unique games** (JSON files in src/processed-games/)`);
writeFileSync(OUTPUT, out.join("\n").trimEnd() + "\n", "utf8");
console.error(`Wrote ${OUTPUT}`);
console.error(`${byJson.size} unique JSONs → ${num - 1} entries`);
