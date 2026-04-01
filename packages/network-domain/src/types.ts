export interface PeerConnection {
  id: string
  connection: RTCPeerConnection
  dataChannel: RTCDataChannel | null
  status: ConnectionStatus
  remoteStream: MediaStream | null
}

export const ConnectionStatus = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed',
} as const

export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus]

export type PeerMessageType = 'chat' | 'system' | 'ping' | 'pong'

export interface PeerMessage<T = unknown> {
  id: string
  type: PeerMessageType
  senderId: string
  timestamp: number
  payload?: T
}

export interface ChatMessagePayload {
  text: string
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate'
  from: string
  to: string
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

export interface PeerMedia {
  peerId: string
  stream: MediaStream
}
