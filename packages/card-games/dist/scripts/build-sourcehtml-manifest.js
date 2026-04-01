#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_HTML = join(__dirname, "..", "SourceHtml");
const OUTPUT = join(SOURCE_HTML, "manifest.json");
const canonicalRe = /<link[^>]*rel\s*=\s*['"](?:canonical)['"][^>]*href\s*=\s*['"]([^'"]+)['"]/i;
const ogUrlRe = /<meta[^>]*property\s*=\s*['"]og:url['"][^>]*content\s*=\s*['"]([^'"]+)['"]/i;
const pagatPathRe = /<meta[^>]*name\s*=\s*['"]pagat-path['"][^>]*content\s*=\s*['"]([^'"]+)['"]/i;
const schemaUrlRe = /"url"\s*:\s*"https?:\/\/[^"]+"/g;
const titleRe = /<title[^>]*>([^<]+)<\/title>/i;
const sourceMetaRe = /<meta[^>]*name\s*=\s*['"]source['"][^>]*content\s*=\s*['"]([^'"]+)['"]/i;
const contentFromRe = /^#\s*Content from\s+(https?:\/\/\S+)/m;
const baseHrefRe = /<base\s+[^>]*href\s*=\s*['"]([^'"]+)['"]/i;
const bicycleBaseRe = /"BASE_URL"\s*:\s*"([^"]+)"/;
const wgRedirectedFromRe = /"wgRedirectedFrom"\s*:\s*"([^"]+)"/;
function extractUrl(filePath) {
    const raw = readFileSync(filePath, "utf8");
    const head = raw.slice(0, 15000);
    const fileName = String(filePath).split(/[/\\]/).pop() || "";
    let m = head.match(canonicalRe);
    if (m)
        return m[1].trim();
    m = head.match(ogUrlRe);
    if (m)
        return m[1].trim();
    m = head.match(pagatPathRe);
    if (m)
        return "https://www.pagat.com" + m[1].replace(/^\//, "/").trim();
    const schemaMatches = head.match(schemaUrlRe);
    if (schemaMatches) {
        const u = schemaMatches[0].replace(/^"url"\s*:\s*"/, "").replace(/"$/, "");
        if (u.startsWith("http"))
            return u;
    }
    m = raw.match(contentFromRe);
    if (m)
        return m[1].trim();
    m = head.match(titleRe);
    if (m) {
        const title = m[1].trim();
        const src = head.match(sourceMetaRe)?.[1]?.toLowerCase();
        if (src === "wikipedia" || fileName.startsWith("wiki-")) {
            const slug = title.replace(/\s+/g, "_");
            return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug).replace(/%2F/g, "/")}`;
        }
    }
    if (fileName.startsWith("bicyclecards-")) {
        const slug = fileName.replace(/^bicyclecards-|\.html$/g, "");
        const baseMatch = head.match(bicycleBaseRe);
        const base = baseMatch ? baseMatch[1].replace(/\/$/, "") : "https://bicyclecards.com";
        return `${base}/how-to-play/${slug}`;
    }
    if (fileName.startsWith("parlett-")) {
        const slug = fileName.replace(/^parlett-|\.html$/g, "").replace(/-/g, "_");
        const baseMatch = head.match(baseHrefRe);
        let base = baseMatch ? baseMatch[1].replace(/\/$/, "") : null;
        if (!base) {
            if (head.includes("histocg.css"))
                base = "https://www.parlettgames.uk/histocg";
            else if (slug.startsWith("minimis"))
                base = "https://www.parlettgames.uk/oricards";
            else
                base = "https://www.parlettgames.uk/histocs";
        }
        return `${base}/${slug}.html`;
    }
    if (fileName.startsWith("semicolon-")) {
        const slug = fileName.replace(/^semicolon-|\.html$/g, "");
        const parts = slug.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1));
        const name = parts.join("");
        return `https://www.semicolon.com/Solitaire/Rules/${name}.html`;
    }
    if (fileName.startsWith("catsatcards-")) {
        const slug = fileName.replace(/^catsatcards-|\.html$/g, "");
        const name = slug
            .split("-")
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join("_");
        return `https://catsatcards.com/Games/${name}.html`;
    }
    if (fileName.startsWith("acecardgames-")) {
        const slug = fileName.replace(/^acecardgames-|\.html$/g, "").replace(/-/g, "-");
        return `https://www.acecardgames.com/${slug}/`;
    }
    if (fileName.startsWith("onpixelgames-")) {
        const slug = fileName.replace(/^onpixelgames-|\.html$/g, "").replace(/-/g, "-");
        return `https://onpixelgames.com/en/misc/solitaire-rules/${slug}/`;
    }
    if (fileName.startsWith("bvssolitaire-")) {
        const slug = fileName.replace(/^bvssolitaire-|\.html$/g, "").replace(/-/g, "-");
        return `https://www.bvssolitaire.com/rules/${slug}.asp`;
    }
    if (fileName.startsWith("wizardofodds-")) {
        const slug = fileName.replace(/^wizardofodds-|\.html$/g, "");
        const pathSegment = slug.includes("badeucy") ? `poker/${slug}` : slug;
        return `https://wizardofodds.com/games/${pathSegment}/`;
    }
    if (fileName.startsWith("riichi-wiki"))
        return "https://riichi.wiki/";
    if (fileName.startsWith("scribd-"))
        return "https://www.scribd.com/document/House-of-Cards-Game";
    if (fileName.startsWith("norskespilleautomater-"))
        return "https://norskespilleautomater.io/kortspill/kanin";
    if (fileName.startsWith("ispa-"))
        return "https://www.ispa-world.org/";
    if (fileName.startsWith("namu-"))
        return "https://namu.wiki/w/%EA%B3%A0%EC%8A%A4%ED%86%B1";
    if (fileName.startsWith("piatnik-"))
        return "https://www.piatnik.com/en/games/cards/rainbow";
    if (fileName.startsWith("rainbowthecardgame"))
        return "https://rainbowthecardgame.com/";
    return null;
}
const manifest = {};
const redirects = {};
const files = readdirSync(SOURCE_HTML).filter((f) => f.endsWith(".html"));
for (const f of files) {
    const fp = join(SOURCE_HTML, f);
    const url = extractUrl(fp);
    if (url)
        manifest[f] = url;
    if (/^wiki-/.test(f)) {
        const raw = readFileSync(fp, "utf8").slice(0, 8000);
        const m = raw.match(wgRedirectedFromRe);
        if (m) {
            const from = "https://en.wikipedia.org/wiki/" + m[1];
            redirects[from] = f;
        }
    }
}
const output = { ...manifest };
if (Object.keys(redirects).length)
    output._redirects = redirects;
writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + "\n", "utf8");
const withUrl = Object.keys(manifest).length;
console.error(`SourceHtml/manifest.json: ${withUrl}/${files.length} files mapped to URL`);
