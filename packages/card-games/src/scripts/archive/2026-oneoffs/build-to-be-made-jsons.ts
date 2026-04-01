#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INPUT = join(ROOT, "manifest-likely-new-games.txt");
const OUTPUT = join(ROOT, "TO_BE_MADE_JSONS.md");

const INDEX_LIKE =
  /\/index\.html?$|^https:\/\/[^/]+\/[^/]+\/?$|\/(com|domino|fishing|banking|allfours|adders|beating|auctionwhist|boston|rams|patience|climbing|tarot|marriage|jass|rummy|misc|reverse|schafkopf|tressette|trumps|vying|war|preference|quotawhist|picture|inflation|poker\/variants)\/?$/i;
const INDEX_FILE = /-index\.html$/;
const SKIP_FILES = ["piatnik-rainbow.html", "wiki-list-of-card-games.html"];

function slugFromRow(htmlFile: string): string {
  const base = htmlFile.replace(/\.html$/, "");
  const withoutPrefix = base
    .replace(/^pagat-/, "")
    .replace(/^wiki-/, "wiki-")
    .replace(/^parlett-/, "parlett-")
    .replace(/^wizardofodds-/, "wizardofodds-")
    .replace(/^semicolon-/, "semicolon-");
  return withoutPrefix.replace(/_/g, "-") + ".json";
}

interface Row {
  htmlFile: string;
  url: string;
  slug: string;
}

const lines = readFileSync(INPUT, "utf8").trim().split("\n");
const rows: Row[] = [];
for (const line of lines) {
  const [htmlFile, url] = line.split("\t");
  if (!htmlFile || !url) continue;
  if (SKIP_FILES.includes(htmlFile)) continue;
  if (INDEX_FILE.test(htmlFile)) continue;
  if (INDEX_LIKE.test(url)) continue;
  const slug = slugFromRow(htmlFile);
  rows.push({ htmlFile, url, slug });
}

const slugsOnly = rows.map((r) => r.slug).join("\n");

const md = `# Games Needing New JSON Files

Generated from \`manifest-likely-new-games.txt\` (orphan HTML with no JSON referencing that URL).

**Total: ${rows.length} games**

| # | Suggested JSON | HTML Source | URL |
|---|----------------|-------------|-----|
${rows.map((r, i) => `| ${i + 1} | \`${r.slug}\` | ${r.htmlFile} | ${r.url} |`).join("\n")}

## JSON filenames only (for scripts)

\`\`\`
${slugsOnly}
\`\`\`

## How to use

1. Create \`processed-games/<slug>\` from the HTML in \`SourceHtml/<htmlFile>\`
2. Add the URL to \`sources.primary\` or \`sources.additional\`
3. Run \`node scripts/check-manifest-vs-json.mjs\` to refresh orphan count
`;

writeFileSync(OUTPUT, md, "utf8");
writeFileSync(join(ROOT, "TO_BE_MADE_JSONS.txt"), slugsOnly + "\n", "utf8");
console.log(`Wrote ${OUTPUT} with ${rows.length} entries`);
console.log(`Wrote TO_BE_MADE_JSONS.txt (plain list)`);
