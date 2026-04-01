export declare function isValidOverridePath(path: string): boolean;
export declare function validateOverridePaths(variations: {
    list?: Array<{
        overrides?: Record<string, unknown>;
    }>;
}): {
    valid: true;
} | {
    valid: false;
    invalidPaths: string[];
};
