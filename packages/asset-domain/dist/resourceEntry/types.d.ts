export declare const ResourceEntryType: {
    readonly AssetResourceEntry: "AssetResourceEntry";
    readonly ImageResourceEntry: "ImageResourceEntry";
    readonly FileResourceEntry: "FileResourceEntry";
    readonly SoundResourceEntry: "SoundResourceEntry";
    readonly VideoResourceEntry: "VideoResourceEntry";
    readonly FolderResourceEntry: "FolderResourceEntry";
};
export type ResourceEntryType = typeof ResourceEntryType[keyof typeof ResourceEntryType];
