export interface NestedAsset {
    __nestedAsset: true;
    guid: string;
    type: string;
    data: Record<string, unknown>;
}
