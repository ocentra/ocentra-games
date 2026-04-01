#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GameSchema } from "../schema/zod/game-schema.js";
import { PROCESSED_GAMES_DIR } from "../paths.js";
import { validateOverridePaths } from "../schema/data/override-paths.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
function die(msg) {
    console.error(msg);
    process.exit(1);
}
function isDir(p) {
    try {
        return fs.statSync(p).isDirectory();
    }
    catch {
        return false;
    }
}
function isFile(p) {
    try {
        return fs.statSync(p).isFile();
    }
    catch {
        return false;
    }
}
function readJson(p) {
    try {
        return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
    catch (e) {
        die(`FAIL: Could not read/parse JSON: ${p}\n${String(e)}`);
    }
}
function walkJsonFiles(dir) {
    const out = [];
    const stack = [dir];
    while (stack.length) {
        const d = stack.pop();
        const entries = fs.readdirSync(d, { withFileTypes: true });
        for (const ent of entries) {
            const full = path.join(d, ent.name);
            if (ent.isDirectory())
                stack.push(full);
            else if (ent.isFile() && ent.name.toLowerCase().endsWith(".json"))
                out.push(full);
        }
    }
    return out.sort();
}
function* walkJsonFilesLazy(dir) {
    const stack = [dir];
    while (stack.length) {
        const d = stack.pop();
        const entries = fs.readdirSync(d, { withFileTypes: true });
        for (const ent of entries) {
            const full = path.join(d, ent.name);
            if (ent.isDirectory())
                stack.push(full);
            else if (ent.isFile() && ent.name.toLowerCase().endsWith(".json"))
                yield full;
        }
    }
}
function* expandTargetsLazy(targets, prefix = null) {
    const seen = new Set();
    for (const t of targets) {
        const abs = path.isAbsolute(t) ? t : path.join(process.cwd(), t);
        if (isDir(abs)) {
            for (const file of walkJsonFilesLazy(abs)) {
                if (!seen.has(file) && (prefix == null || fileMatchesPrefix(file, prefix))) {
                    seen.add(file);
                    yield file;
                }
            }
        }
        else if (isFile(abs)) {
            if (!seen.has(abs) && (prefix == null || fileMatchesPrefix(abs, prefix))) {
                seen.add(abs);
                yield abs;
            }
        }
        else {
            const alt = path.join(path.dirname(PROCESSED_GAMES_DIR), t);
            if (isDir(alt)) {
                for (const file of walkJsonFilesLazy(alt)) {
                    if (!seen.has(file) && (prefix == null || fileMatchesPrefix(file, prefix))) {
                        seen.add(file);
                        yield file;
                    }
                }
            }
            else if (isFile(alt)) {
                if (!seen.has(alt) && (prefix == null || fileMatchesPrefix(alt, prefix))) {
                    seen.add(alt);
                    yield alt;
                }
            }
            else
                die(`FAIL: Target not found: ${t}`);
        }
    }
}
function fileMatchesPrefix(filePath, prefix) {
    return path.basename(filePath).toLowerCase().startsWith(prefix.toLowerCase());
}
const DECK_ERROR_PATHS = [
    "engine.deckType",
    "engine.suitSet",
    "engine.rankSet",
    "engine.deckDescription",
    "engine.suitDescription",
    "engine.rankDescription",
];
function isDeckRelatedError(path, message) {
    if (DECK_ERROR_PATHS.some((p) => path === p || path.startsWith(p + ".")))
        return true;
    if (/Custom is disallowed/i.test(message))
        return true;
    if (/deckDescription must be/i.test(message))
        return true;
    if (/suitDescription must be/i.test(message))
        return true;
    if (/rankDescription must be/i.test(message))
        return true;
    if (/String must contain at least 1 character/.test(message) && (path.includes("deckDescription") || path.includes("suitDescription") || path.includes("rankDescription")))
        return true;
    return false;
}
function parseArgs(argv) {
    const args = {
        targets: [],
        failFast: false,
        quiet: false,
        json: false,
        listFailures: false,
        listFailuresLimit: null,
        prefix: null,
        skipUrlCheck: false,
        schemaOnly: false,
        deckErrorsOnly: false,
        strict: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--fail-fast")
            args.failFast = true;
        else if (a === "--quiet" || a === "-q")
            args.quiet = true;
        else if (a === "--json")
            args.json = true;
        else if (a === "--list-failures" || a === "-l") {
            args.listFailures = true;
            const eq = a.indexOf("=");
            const next = argv[i + 1];
            if (eq !== -1) {
                const n = parseInt(a.slice(eq + 1), 10);
                if (!Number.isInteger(n) || n < 1)
                    die(`Invalid --list-failures limit: ${a.slice(eq + 1)}`);
                args.listFailuresLimit = n;
            }
            else if (/^\d+$/.test(next ?? "")) {
                args.listFailuresLimit = parseInt(next, 10);
                i++;
            }
        }
        else if (a.startsWith("--list-failures=")) {
            args.listFailures = true;
            const n = parseInt(a.slice("--list-failures=".length), 10);
            if (!Number.isInteger(n) || n < 1)
                die(`Invalid --list-failures limit: ${a.slice("--list-failures=".length)}`);
            args.listFailuresLimit = n;
        }
        else if (/^-l\d+$/.test(a)) {
            args.listFailures = true;
            args.listFailuresLimit = parseInt(a.slice(2), 10);
        }
        else if (args.listFailures && args.listFailuresLimit == null && /^\d+$/.test(a)) {
            args.listFailuresLimit = parseInt(a, 10);
            if (args.listFailuresLimit < 1)
                die(`Invalid limit: ${a}`);
        }
        else if (a === "--prefix" || a === "-p") {
            if (argv[i + 1] == null)
                die("Missing value for --prefix");
            args.prefix = argv[++i].toLowerCase();
        }
        else if (a.startsWith("--prefix=")) {
            args.prefix = a.slice("--prefix=".length).toLowerCase();
        }
        else if (args.listFailures && args.prefix == null && /^[a-zA-Z]+$/.test(a) && a.length <= 10) {
            args.prefix = a.toLowerCase();
        }
        else if (a === "--skip-url-check" || a === "--no-verify-urls")
            args.skipUrlCheck = true;
        else if (a === "--schema-only")
            args.schemaOnly = true;
        else if (a === "--deck-errors-only" || a === "--list-deck-errors")
            args.deckErrorsOnly = true;
        else if (a === "--strict" || a === "-s")
            args.strict = true;
        else if (a === "--help" || a === "-h") {
            console.log(`
Usage:
  npx tsx src/scripts/validate-with-ts-schema.ts <fileOrDir> [more...] [--fail-fast] [--quiet] [--json] [--list-failures[=N]] [--skip-url-check] [--schema-only]

Validates game JSON files against the Zod schema. Uses game-schema.ts as single source of truth.

Options:
  --fail-fast        Stop on first failure
  --quiet, -q        Only print failures (with error details)
  --json             Output JSON report
  --list-failures, -l [N]  Print only failing JSON filenames, one per line (to stdout).
                           Optional N limits to first N failing (e.g. -l20 or --list-failures=40).
  --deck-errors-only       With --list-failures: only list files that have at least one deck/suit/rank/description error (for script vs manual targeting).
  --prefix P, -p P         Only validate JSONs whose name starts with P (e.g. --prefix a).
  --skip-url-check         Skip primary source URL reachability (offline mode)
  --schema-only            Verify schema compiles and exit
  --strict, -s             Run validated-content checks on every file (treat as status=validated).
                           Use to see which files would fail if marked validated; no file changes.

Examples:
  npx tsx src/scripts/validate-with-ts-schema.ts src/processed-games
  npx tsx src/scripts/validate-with-ts-schema.ts src/processed-games --list-failures
  npx tsx src/scripts/validate-with-ts-schema.ts src/processed-games -l 20
  npx tsx src/scripts/validate-with-ts-schema.ts src/processed-games --list-failures=40
  npx tsx src/scripts/validate-with-ts-schema.ts src/processed-games --list-failures > failing-games-full.txt
`);
            process.exit(0);
        }
        else if (a.startsWith("-")) {
            die(`Unknown option: ${a}`);
        }
        else {
            args.targets.push(a);
        }
    }
    if (args.targets.length === 0 && !args.schemaOnly) {
        args.targets.push(PROCESSED_GAMES_DIR);
    }
    return args;
}
function expandTargets(targets) {
    const files = [];
    for (const t of targets) {
        const abs = path.isAbsolute(t) ? t : path.join(process.cwd(), t);
        if (isDir(abs))
            files.push(...walkJsonFiles(abs));
        else if (isFile(abs))
            files.push(abs);
        else {
            const alt = path.join(path.dirname(PROCESSED_GAMES_DIR), t);
            if (isDir(alt))
                files.push(...walkJsonFiles(alt));
            else if (isFile(alt))
                files.push(alt);
            else
                die(`FAIL: Target not found: ${t}`);
        }
    }
    return Array.from(new Set(files));
}
const URL_CHECK_TIMEOUT_MS = 8000;
async function isUrlReachable(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), URL_CHECK_TIMEOUT_MS);
        const res = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
            redirect: "follow",
            headers: { "User-Agent": "Ocentra-Validate-Game/1.0" },
        });
        clearTimeout(timeout);
        return res.ok;
    }
    catch {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), URL_CHECK_TIMEOUT_MS);
            const res = await fetch(url, {
                method: "GET",
                signal: controller.signal,
                redirect: "follow",
                headers: { "User-Agent": "Ocentra-Validate-Game/1.0" },
            });
            clearTimeout(timeout);
            return res.ok;
        }
        catch {
            return false;
        }
    }
}
async function checkPrimaryUrlsReachable(data) {
    const primary = data?.sources?.primary;
    if (!Array.isArray(primary) || primary.length === 0)
        return { ok: false, msg: "sources.primary: at least one source required" };
    const urls = primary
        .filter((s) => typeof s?.url === "string" && s.url.startsWith("http"))
        .map((s) => s.url);
    if (urls.length === 0)
        return {
            ok: false,
            msg: "sources.primary: at least one source must have a valid http/https URL",
        };
    for (const url of urls) {
        if (await isUrlReachable(url))
            return { ok: true, msg: "" };
    }
    return {
        ok: false,
        msg: `sources.primary: no reachable URL (all returned 404 or failed). URLs checked: ${urls.slice(0, 3).join(", ")}${urls.length > 3 ? " ..." : ""}`,
    };
}
function ruleLabel(path, message) {
    if (path === "overview.subCategory" && /not valid for overview.category|can only have subcategories|cannot be null.*subCategory/i.test(message))
        return "overview.subCategory (category pair)";
    if (path === "overview.category")
        return "overview.category";
    if (path === "overview.difficulty")
        return "overview.difficulty";
    if (path === "overview.description")
        return "overview.description";
    if (path === "overview")
        return "overview (origin/duration)";
    if (path === "extraction.status") {
        if (/missingCritical|missing critical/i.test(message))
            return "extraction.status";
        if (/Pagat|external sites/i.test(message))
            return "Key fields (Pagat/stub)";
        return "extraction.status";
    }
    if (path === "strategy")
        return "strategy";
    if (path === "variations")
        return "variations";
    if (path === "quality")
        return "quality";
    if (path === "completeness")
        return "completeness";
    if (path === "rules.keyRules")
        return "rules.keyRules";
    if (path.startsWith("variations."))
        return path;
    if (path.startsWith("sources.primary") || path === "sources.primary")
        return /reachable|url|404|wrong/i.test(message) ? "sources.primary (url)" : "sources.primary";
    return path;
}
function issueSummary(message, maxLen = 120) {
    const one = message.replace(/\s+/g, " ").trim();
    return one.length <= maxLen ? one : one.slice(0, maxLen - 3) + "...";
}
const OVERVIEW_NA_PATHS = new Set(["overview.category", "overview.difficulty", "overview.origin", "overview.duration"]);
function printFailureSummary(basename, errors) {
    console.error(`\nValidation for \`${basename}\` failed. Summary:\n`);
    console.error("**Validation result: FAIL**\n");
    const onlyOverviewNa = errors.length > 0 && errors.every((e) => OVERVIEW_NA_PATHS.has(e.path));
    if (onlyOverviewNa) {
        console.error("Overview has NA, Unknown, or empty in category, difficulty, origin, or duration. Either set real values from the primary source or add extraction.overviewNaReasons with a reason (min 15 characters) for each.\n");
    }
    else {
        console.error("The validator found issues (e.g. stub/placeholder data, or NA/Unknown without a reason). Fix the fields below or add extraction.overviewNaReasons where NA is valid for this game.\n");
    }
    console.error("| Rule | Issue |");
    console.error("|------|--------|");
    for (const e of errors) {
        const rule = ruleLabel(e.path, e.message);
        const issue = issueSummary(e.message).replace(/\|/g, "\\|");
        console.error(`| **${rule}** | ${issue} |`);
    }
    console.error("");
}
function validateFile(filePath, data) {
    const result = GameSchema.safeParse(data);
    if (!result.success) {
        const errors = result.error.issues.map((err) => ({
            path: err.path.length ? err.path.join(".") : "root",
            message: err.message,
        }));
        return { ok: false, errors };
    }
    const game = result.data;
    const overrideResult = validateOverridePaths(game.variations);
    if (!overrideResult.valid) {
        return {
            ok: false,
            errors: overrideResult.invalidPaths.map((p) => ({
                path: "variations.overrides",
                message: `variations.overrides path "${p}" is not a valid engine override path`,
            })),
        };
    }
    return { ok: true, game };
}
(async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.schemaOnly) {
        console.log("Schema compiles OK");
        process.exit(0);
    }
    const useLazyLimit = args.listFailures && args.listFailuresLimit != null;
    let files = useLazyLimit ? [] : expandTargets(args.targets);
    if (!useLazyLimit && args.prefix != null) {
        files = files.filter((f) => fileMatchesPrefix(f, args.prefix));
    }
    const fileIterator = useLazyLimit
        ? expandTargetsLazy(args.targets, args.prefix)
        : files;
    if (!useLazyLimit && files.length === 0)
        die("FAIL: No JSON files found.");
    let okCount = 0;
    let failCount = 0;
    const failures = [];
    const results = [];
    let fileCount = 0;
    for (const file of fileIterator) {
        fileCount++;
        const data = readJson(file);
        const validation = validateFile(file, data);
        const basename = path.basename(file);
        if (!validation.ok) {
            failCount++;
            const reasons = validation.errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message));
            const hasDeckError = validation.errors.some((e) => isDeckRelatedError(e.path ?? "", e.message));
            if (!args.deckErrorsOnly || hasDeckError) {
                failures.push({ file: basename, reasons });
            }
            if (args.json) {
                results.push({ file: basename, valid: false, errors: validation.errors });
            }
            else if (!args.listFailures) {
                printFailureSummary(basename, validation.errors);
            }
            if (args.failFast)
                break;
            if (useLazyLimit && failures.length >= args.listFailuresLimit)
                break;
            continue;
        }
        if (!args.skipUrlCheck) {
            const urlResult = await checkPrimaryUrlsReachable(data);
            if (!urlResult.ok) {
                failCount++;
                if (!args.deckErrorsOnly)
                    failures.push({ file: basename, reasons: [urlResult.msg] });
                if (args.json) {
                    results.push({
                        file: basename,
                        valid: false,
                        errors: [{ path: "sources.primary", message: urlResult.msg }],
                    });
                }
                else if (!args.listFailures) {
                    console.error(`FAIL  ${basename}`);
                    console.error(`     - sources.primary: ${urlResult.msg}`);
                }
                if (args.failFast)
                    break;
                if (useLazyLimit && failures.length >= args.listFailuresLimit)
                    break;
                continue;
            }
        }
        okCount++;
        const game = validation.game;
        if (!args.quiet && !args.json && !args.listFailures) {
            console.log(`OK  ${basename}  (${game.quality}, ${game.overview.category ?? "Unknown"})`);
        }
        results.push({ file: basename, valid: true, errors: [] });
    }
    if (useLazyLimit && fileCount === 0)
        die("FAIL: No JSON files found.");
    if (args.listFailures) {
        const sep = "----------------------";
        const toPrint = args.listFailuresLimit != null ? failures.slice(0, args.listFailuresLimit) : failures;
        for (let i = 0; i < toPrint.length; i++) {
            const { file, reasons } = toPrint[i];
            const n = String(i + 1).padStart(4);
            console.log(sep);
            console.log(`${n}. ${file} : reason`);
            for (const r of reasons) {
                console.log(`    - ${r}`);
            }
            console.log(sep);
        }
        if (!args.quiet && failures.length > 0) {
            const limitNote = args.listFailuresLimit != null && failures.length > args.listFailuresLimit
                ? ` (showing first ${args.listFailuresLimit})`
                : "";
            const deckNote = args.deckErrorsOnly ? ` — ${failures.length} with deck/suit/rank/description errors (of ${failCount} total failing)` : "";
            console.error(`\n${failures.length} failing of ${okCount + failCount} files${limitNote}${deckNote}`);
        }
    }
    else if (args.json) {
        console.log(JSON.stringify({ ok: okCount, fail: failCount, results }, null, 2));
    }
    else if (!args.quiet) {
        console.log(`\n${okCount + failCount} files — ${okCount} passed, ${failCount} failed`);
    }
    process.exit(failCount === 0 ? 0 : 1);
})();
