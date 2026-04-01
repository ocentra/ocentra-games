export interface MultiplayerStoredConfig {
  humans: number;
  ai: number;
  aiModel: string;
  gameId: string;
  gameName: string;
}

export const MultiplayerStorageKey = {
  Config: 'multiplayer.config',
} as const;

export const DefaultMultiplayerConfig: MultiplayerStoredConfig = {
  humans: 2,
  ai: 2,
  aiModel: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
  gameId: 'claim',
  gameName: 'claim',
};

export const MatchmakingPollIntervalMs = 3000;

export function readMultiplayerConfig(): MultiplayerStoredConfig {
  if (typeof window === 'undefined') {
    return DefaultMultiplayerConfig;
  }

  const raw = window.sessionStorage.getItem(MultiplayerStorageKey.Config);
  if (!raw) {
    return DefaultMultiplayerConfig;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MultiplayerStoredConfig>;
    return {
      humans: typeof parsed.humans === 'number' ? parsed.humans : DefaultMultiplayerConfig.humans,
      ai: typeof parsed.ai === 'number' ? parsed.ai : DefaultMultiplayerConfig.ai,
      aiModel: typeof parsed.aiModel === 'string' && parsed.aiModel.length > 0
        ? parsed.aiModel
        : DefaultMultiplayerConfig.aiModel,
      gameId: typeof parsed.gameId === 'string' && parsed.gameId.length > 0
        ? parsed.gameId
        : DefaultMultiplayerConfig.gameId,
      gameName: typeof parsed.gameName === 'string' && parsed.gameName.length > 0
        ? parsed.gameName
        : DefaultMultiplayerConfig.gameName,
    };
  } catch {
    return DefaultMultiplayerConfig;
  }
}
