#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROCESSED = join(ROOT, "processed-games");
const GAME_NAMES = join(ROOT, "schema", "game_names_pagat.txt");
const MAP_FILE = join(ROOT, "data", "orphan-to-json-map.json");
function normalize(u) {
    try {
        const x = new URL(u);
        return (x.origin + x.pathname.replace(/\/$/, "") || x.origin + "/").toLowerCase();
    }
    catch {
        return String(u).toLowerCase();
    }
}
const urlToJson = new Map();
const URL_RE = /https?:\/\/[^\s|]+/g;
const LINE_RE = /^([^#\s].+?)\s*:\s*card-games\/processed-games\/([^\s:]+\.json)\s*:\s*(.+)$/;
function addUrlToJson(n, jsonFile) {
    if (!urlToJson.has(n))
        urlToJson.set(n, new Set());
    urlToJson.get(n).add(jsonFile);
}
if (existsSync(GAME_NAMES)) {
    for (const line of readFileSync(GAME_NAMES, "utf8").split("\n")) {
        const m = line.match(LINE_RE);
        if (!m)
            continue;
        const [, , jsonFile, urlPart] = m;
        for (const u of urlPart.match(URL_RE) || []) {
            const url = u.replace(/[\s,]+$/, "").trim();
            const n = normalize(url);
            addUrlToJson(n, jsonFile);
            if (/pagat\.com/i.test(url)) {
                const alt = n.replace(/\/schafk\//, "/schafkopf/").replace(/\/schafkopf\//, "/schafk/");
                const alt2 = n.replace(/\/quotawhist\//, "/whist/").replace(/\/whist\//, "/quotawhist/");
                if (alt !== n)
                    addUrlToJson(alt, jsonFile);
                if (alt2 !== n)
                    addUrlToJson(alt2, jsonFile);
            }
            if (/catsatcards\.com/i.test(url)) {
                const alt = n.replace(/^https:\/\/www\./, "https://").replace(/^https:\/\/(?!www\.)/, "https://www.");
                if (alt !== n)
                    addUrlToJson(alt, jsonFile);
            }
        }
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
for (const f of readdirSync(PROCESSED).filter((x) => x.endsWith(".json"))) {
    for (const u of getUrlsFromJson(f)) {
        const n = normalize(u);
        addUrlToJson(n, f);
        if (/pagat\.com/i.test(u)) {
            const alt = n.replace(/\/schafk\//, "/schafkopf/").replace(/\/schafkopf\//, "/schafk/");
            const alt2 = n.replace(/\/quotawhist\//, "/whist/").replace(/\/whist\//, "/quotawhist/");
            if (alt !== n)
                addUrlToJson(alt, f);
            if (alt2 !== n)
                addUrlToJson(alt2, f);
        }
        if (/catsatcards\.com/i.test(u)) {
            const alt = n.replace(/^https:\/\/www\./, "https://").replace(/^https:\/\/(?!www\.)/, "https://www.");
            if (alt !== n)
                addUrlToJson(alt, f);
        }
    }
}
function isInserted(normUrl) {
    if (urlToJson.has(normUrl))
        return true;
    if (/pagat\.com/i.test(normUrl)) {
        const alt = normUrl.replace(/\/schafk\//, "/schafkopf/").replace(/\/schafkopf\//, "/schafk/");
        const alt2 = normUrl.replace(/\/quotawhist\//, "/whist/").replace(/\/whist\//, "/quotawhist/");
        if (urlToJson.has(alt) || urlToJson.has(alt2))
            return true;
    }
    if (/catsatcards\.com/i.test(normUrl)) {
        const alt = normUrl.replace(/^https:\/\/www\./, "https://").replace(/^https:\/\/(?!www\.)/, "https://www.");
        if (urlToJson.has(alt))
            return true;
    }
    return false;
}
const map = JSON.parse(readFileSync(MAP_FILE, "utf8"));
const inserted = [];
const notInserted = [];
for (const [url, jsonFile] of Object.entries(map)) {
    const n = normalize(url);
    if (isInserted(n)) {
        inserted.push({ url, jsonFile });
    }
    else {
        notInserted.push({ url, jsonFile });
    }
}
console.log("=== orphan-to-json-map: inserted vs not inserted ===\n");
console.log(`Total entries: ${Object.keys(map).length}`);
console.log(`Already INSERTED (remove from map): ${inserted.length}`);
console.log(`NOT inserted (keep in map): ${notInserted.length}\n`);
if (inserted.length > 0) {
    console.log("INSERTED (can remove from orphan-to-json-map):");
    for (const { url, jsonFile } of inserted) {
        const n = normalize(url);
        let refs = urlToJson.get(n);
        if (!refs && /pagat\.com/i.test(n)) {
            refs =
                urlToJson.get(n.replace(/\/schafk\//, "/schafkopf/").replace(/\/schafkopf\//, "/schafk/")) ||
                    urlToJson.get(n.replace(/\/quotawhist\//, "/whist/").replace(/\/whist\//, "/quotawhist/"));
        }
        const refStr = refs ? [...refs].join(", ") : "?";
        console.log(`  ${url}`);
        console.log(`    → map says ${jsonFile}, referenced by: ${refStr}`);
    }
    console.log("");
}
if (notInserted.length > 0) {
    console.log("NOT INSERTED (keep in orphan-to-json-map):");
    for (const { url, jsonFile } of notInserted) {
        console.log(`  ${url} → ${jsonFile}`);
    }
}
