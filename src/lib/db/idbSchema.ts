// idbSchema.ts
// Adapted from TabAgent for Claim AI model management

export const DBNames = Object.freeze({
  DB_MODELS: 'ClaimAIModels',
  // Note: Only AI-related DBs. Chat/message storage can be added later if needed for AI history
});

// Per erasableSyntaxOnly: Use const object instead of enum
export const NodeType = {
  Chat: 'chat',
  Message: 'message',
  Embedding: 'embedding',
  Attachment: 'attachment',
  Summary: 'summary',
} as const;

export type NodeType = typeof NodeType[keyof typeof NodeType];

export const LogLevel = {
  Info: 'info',
  Log: 'log',
  Warn: 'warn',
  Error: 'error',
  Debug: 'debug',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export const schema = {
  [DBNames.DB_MODELS]: {
    version: 1,
    stores: {
      files: {
        keyPath: 'url',
        indexes: []
      },
      manifest: {
        keyPath: 'repo',
        indexes: []
      },
      inferenceSettings: {
        keyPath: 'id',
        indexes: []
      }
    }
  },
};

// Note: Removed BroadcastChannel as Claim uses EventBus instead
