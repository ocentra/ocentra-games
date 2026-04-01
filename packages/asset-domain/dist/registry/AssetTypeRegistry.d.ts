type AssetConstructor = new () => unknown;
export declare function register(typeName: string, constructor: AssetConstructor): void;
export declare function get(typeName: string): AssetConstructor | null;
export declare function has(typeName: string): boolean;
export declare function clear(): void;
export {};
