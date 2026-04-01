import { ValidationPattern } from './constants/validation-pattern.js';
export function extractGameIdFromPath(path) {
    const match = path.match(ValidationPattern.GameModePath);
    return match ? match[1] : null;
}
export function extractCategoryFromPath(path) {
    const match = path.match(/GameMode\/([^/]+)\//);
    if (!match)
        return null;
    return match[1];
}
