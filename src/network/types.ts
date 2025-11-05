// Network-specific types for WebRTC P2P networking

export interface PeerConnection {
  id: string
  connection: RTCPeerConnection
  dataChannel: RTCDataChannel | null
  status: ConnectionStatus
  lastPing: number
  latency: number
  quality: NetworkQuality
}

export const ConnectionStatus = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed',
} as const

export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus]

export const NetworkQuality = {
  EXCELLENT: 'excellent', // < 50ms latency
  GOOD: 'good',          // 50-100ms latency
  FAIR: 'fair',          // 100-200ms latency
  POOR: 'poor',          // > 200ms latency
} as const

export type NetworkQuality = (typeof NetworkQuality)[keyof typeof NetworkQuality]

export interface NetworkMessage {
  type: NetworkMessageType
  senderId: string
  timestamp: number
  data: unknown
  messageId: string
}

export const NetworkMessageType = {
  GAME_ACTION: 'game_action',
  GAME_STATE_SYNC: 'game_state_sync',
  PING: 'ping',
  PONG: 'pong',
  PLAYER_JOIN: 'player_join',
  PLAYER_LEAVE: 'player_leave',
  HEARTBEAT: 'heartbeat',
  ERROR: 'error',
} as const

export type NetworkMessageType = (typeof NetworkMessageType)[keyof typeof NetworkMessageType]

export interface RoomConfig {
  maxPlayers: number
  isPrivate: boolean
  password?: string
  gameSettings: GameSettings
}

export interface GameSettings {
  timeLimit?: number
  allowSpectators: boolean
  aiDifficulty?: string
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'room-join' | 'room-leave'
  roomId: string
  senderId: string
  targetId?: string
  data: unknown
}

export interface NetworkStats {
  latency: number
  packetLoss: number
  bandwidth: number
  jitter: number
  lastUpdated: number
}

export interface ReconnectionConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}