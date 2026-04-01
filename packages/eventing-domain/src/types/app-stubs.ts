export interface AssetTypeInfo {
  type: string;
  category?: string;
  [key: string]: unknown;
}

export interface AssetSyncStatus {
  [key: string]: unknown;
}

export abstract class ScriptableObject {}

export interface GameMode {
  [key: string]: unknown;
}

export interface GamePage {
  [key: string]: unknown;
}

export interface GameHome {
  [key: string]: unknown;
}

export interface ComingSoonTeaser {
  [key: string]: unknown;
}

export interface AssetGUID {
  [key: string]: unknown;
}

export interface ContentBlock {
  [key: string]: unknown;
}

export interface SynthesisContext {
  [key: string]: unknown;
}

export interface SynthesisManifest {
  lastSynthesizedAt: string;
  dependencies: Array<{ guid: string; checksum: string }>;
}

export interface AssetMetadata {
  [key: string]: unknown;
}

export interface AssetEntry {
  [key: string]: unknown;
}

export interface ScanResponse {
  [key: string]: unknown;
}

export interface ScanOptions {
  [key: string]: unknown;
}

export interface ResourceRequest {
  [key: string]: unknown;
}

export const ImageVariant = {
  Icon: 'icon',
  Full: 'full',
} as const;

export type ImageVariant = (typeof ImageVariant)[keyof typeof ImageVariant];

export const PlayerActionType = {
  PICK_UP: 'pick_up',
  DECLINE: 'decline',
  DECLARE_INTENT: 'declare_intent',
  CALL_SHOWDOWN: 'call_showdown',
  REBUTTAL: 'rebuttal',
  REVEAL_FLOOR_CARD: 'reveal_floor_card',
} as const;

export type PlayerActionType = (typeof PlayerActionType)[keyof typeof PlayerActionType];
