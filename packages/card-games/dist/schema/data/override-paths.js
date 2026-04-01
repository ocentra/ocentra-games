import { CONSTANTS_KEYS } from "../../schema/types/constants-keys.js";
import { STOCK_PURCHASE_VALUES, HAND_DEFAULT_VALUES, DISCARD_TOP_VALUES, } from "@ocentra/game-domain/game/cardVisibility";
import { NA_UNKNOWN_VALUES } from "@ocentra/game-domain/game/buyCosts";
const UNSAFE_PATH_PATTERNS = /\.\.|\/|\\|\0/;
const VALID_PATHS = new Set([
    "engine.buyCosts.sources.market",
    "engine.buyCosts.sources.stock",
    "engine.buyCosts.sources.discard",
    "engine.cardVisibility.stockPurchase",
    "engine.cardVisibility.handDefault",
    "engine.cardVisibility.discardTop",
    "engine.finalHandSize",
    "engine.dealPattern",
]);
export function isValidOverridePath(path) {
    if (UNSAFE_PATH_PATTERNS.test(path))
        return false;
    if (VALID_PATHS.has(path))
        return true;
    const m = path.match(/^engine\.constants\.([a-z_]+)$/);
    if (m == null)
        return false;
    return CONSTANTS_KEYS.includes(m[1]);
}
const NUMERIC_CONSTANT_PATTERN = /^engine\.constants\./;
function isValidBuySourceMarket(value) {
    if (value == null || typeof value !== "object")
        return false;
    const o = value;
    if (typeof o.flat !== "number" && o.flat !== null)
        return false;
    if (o.byRank != null && (typeof o.byRank !== "object" || Array.isArray(o.byRank)))
        return false;
    return true;
}
function isValidBuySourceStock(value) {
    if (value == null || typeof value !== "object")
        return false;
    const o = value;
    return typeof o.flat === "number" && Number.isFinite(o.flat);
}
function isValidBuySourceDiscard(value) {
    if (value === null || NA_UNKNOWN_VALUES.includes(value))
        return true;
    if (value != null && typeof value === "object") {
        const o = value;
        return typeof o.flat === "number" && Number.isFinite(o.flat);
    }
    return false;
}
function isValidOverrideValue(path, value) {
    if (NUMERIC_CONSTANT_PATTERN.test(path)) {
        return typeof value === "number" && Number.isFinite(value);
    }
    switch (path) {
        case "engine.buyCosts.sources.market":
            return isValidBuySourceMarket(value);
        case "engine.buyCosts.sources.stock":
            return isValidBuySourceStock(value);
        case "engine.buyCosts.sources.discard":
            return isValidBuySourceDiscard(value);
        case "engine.cardVisibility.stockPurchase":
            return typeof value === "string" && STOCK_PURCHASE_VALUES.includes(value);
        case "engine.cardVisibility.handDefault":
            return typeof value === "string" && HAND_DEFAULT_VALUES.includes(value);
        case "engine.cardVisibility.discardTop":
            return typeof value === "string" && DISCARD_TOP_VALUES.includes(value);
        case "engine.finalHandSize":
            return typeof value === "number" && Number.isInteger(value) && value >= 0;
        case "engine.dealPattern":
            return typeof value === "string" && value.length > 0;
        default:
            return true;
    }
}
export function validateOverridePaths(variations) {
    const invalid = [];
    for (const v of variations.list ?? []) {
        for (const [key, val] of Object.entries(v.overrides ?? {})) {
            if (!isValidOverridePath(key))
                invalid.push(key);
            else if (!isValidOverrideValue(key, val))
                invalid.push(key);
        }
    }
    return invalid.length === 0
        ? { valid: true }
        : { valid: false, invalidPaths: invalid };
}
