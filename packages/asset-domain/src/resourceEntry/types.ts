export const ResourceEntryType = {
  AssetResourceEntry: 'AssetResourceEntry',
  ImageResourceEntry: 'ImageResourceEntry',
  FileResourceEntry: 'FileResourceEntry',
  SoundResourceEntry: 'SoundResourceEntry',
  VideoResourceEntry: 'VideoResourceEntry',
  FolderResourceEntry: 'FolderResourceEntry',
} as const;

export type ResourceEntryType = typeof ResourceEntryType[keyof typeof ResourceEntryType];

