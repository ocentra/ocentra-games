const HASH_REGEX = /^[a-f0-9]{64}$/i;
const CHECKSUM_REGEX = /^[a-f0-9]{32,64}$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isAssetGUID(value) {
    return UUID_REGEX.test(value);
}
export function isAssetHash(value) {
    return HASH_REGEX.test(value);
}
export function isImageHash(value) {
    return HASH_REGEX.test(value);
}
export function isSoundHash(value) {
    return HASH_REGEX.test(value);
}
export function isVideoHash(value) {
    return HASH_REGEX.test(value);
}
export function isAssetChecksum(value) {
    return CHECKSUM_REGEX.test(value) && !isAssetHash(value);
}
export function isAssetIdentifier(value) {
    return isAssetGUID(value) || isAssetHash(value) || isAssetChecksum(value);
}
export function toAssetIdentifier(value) {
    if (isAssetGUID(value)) {
        return value;
    }
    if (isAssetHash(value)) {
        return value;
    }
    if (isAssetChecksum(value)) {
        return value;
    }
    throw new Error(`Invalid asset identifier format: ${value}. Must be GUID, hash (64 hex chars), or checksum (32-64 hex chars).`);
}
export function tryAssetIdentifier(value) {
    if (isAssetIdentifier(value)) {
        return value;
    }
    return null;
}
const GAME_ID_REGEX = /^[a-zA-Z][a-zA-Z0-9]*$/;
export function isGameId(value) {
    return value.trim() !== '' && GAME_ID_REGEX.test(value);
}
export function asGameId(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error('GameId cannot be empty');
    }
    if (!GAME_ID_REGEX.test(trimmed)) {
        throw new Error(`Invalid GameId format: "${value}". Must start with a letter and contain only letters/numbers (e.g., "Claim", "ThreeCardBrag").`);
    }
    return trimmed;
}
export function tryGameId(value) {
    try {
        return asGameId(value);
    }
    catch {
        return null;
    }
}
