// Main P2P Manager
export { P2PManager } from './P2PManager'
export type { P2PManagerConfig, RoomInfo } from './P2PManager'

// Core WebRTC components
export { WebRTCHandler } from './connection/WebRTCHandler'
export { ConnectionRecovery } from './connection/ConnectionRecovery'
export { NetworkMonitor } from './connection/NetworkMonitor'
export { StateSync } from './connection/StateSync'

// Types
export * from './types'

// Additional exports for advanced usage
export type { NetworkMetrics, AdaptiveSettings } from './connection/NetworkMonitor'
export type { SyncConflict, StateSyncConfig } from './connection/StateSync'