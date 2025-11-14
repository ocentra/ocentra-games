import { WebRTCHandler } from '@/network/connection/WebRTCHandler'
import { ConnectionStatus } from '@/network/types'
import type { PeerMessage, ChatMessagePayload } from '@/network/types'

export interface P2PManagerConfig {
  localPeerId: string
  rtcConfiguration?: RTCConfiguration
}

export type ChatMessage = PeerMessage<ChatMessagePayload>

export class P2PManager {
  private readonly config: P2PManagerConfig
  private readonly handler: WebRTCHandler
  private connectionStatuses = new Map<string, ConnectionStatus>()
  private onPeerConnectedCallback?: (peerId: string) => void
  private onPeerDisconnectedCallback?: (peerId: string) => void
  private onChatMessageCallback?: (message: ChatMessage) => void
  private onRemoteStreamCallback?: (peerId: string, stream: MediaStream) => void
  private onIceCandidateCallback?: (peerId: string, candidate: RTCIceCandidate) => void
  private onErrorCallback?: (error: Error) => void
  private localStream: MediaStream | null = null

  constructor(config: P2PManagerConfig) {
    this.config = config
    this.handler = new WebRTCHandler(config.localPeerId, config.rtcConfiguration)

    this.handler.onMessage((peerId, message) => {
      this.handleIncomingMessage(peerId, message)
    })

    this.handler.onConnectionChange((peerId, status) => {
      this.connectionStatuses.set(peerId, status)
      this.handleConnectionChange(peerId, status)
    })

    this.handler.onRemoteStream((peerId, stream) => {
      this.onRemoteStreamCallback?.(peerId, stream)
    })

    this.handler.onIceCandidate((peerId, candidate) => {
      this.onIceCandidateCallback?.(peerId, candidate)
    })
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream
    this.handler.setLocalStream(stream)
  }

  clearLocalStream(): void {
    this.localStream = null
    this.handler.clearLocalStream()
  }

  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    try {
      if (!this.connectionStatuses.has(peerId)) {
        await this.handler.createPeerConnection(peerId)
        // Initialize status to CONNECTING when peer connection is created
        this.connectionStatuses.set(peerId, ConnectionStatus.CONNECTING)
        if (this.localStream) {
          this.handler.setLocalStream(this.localStream)
        }
        this.handler.createDataChannel(peerId)
      }
      return await this.handler.createOffer(peerId)
    } catch (error) {
      this.onErrorCallback?.(error as Error)
      throw error
    }
  }

  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    try {
      if (!this.connectionStatuses.has(peerId)) {
        await this.handler.createPeerConnection(peerId)
        // Initialize status to CONNECTING when peer connection is created
        this.connectionStatuses.set(peerId, ConnectionStatus.CONNECTING)
        if (this.localStream) {
          this.handler.setLocalStream(this.localStream)
        }
      }
      await this.handler.setRemoteDescription(peerId, offer)
      return await this.handler.createAnswer(peerId)
    } catch (error) {
      this.onErrorCallback?.(error as Error)
      throw error
    }
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.handler.setRemoteDescription(peerId, answer)
    } catch (error) {
      this.onErrorCallback?.(error as Error)
      throw error
    }
  }

  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.handler.addIceCandidate(peerId, candidate)
    } catch (error) {
      this.onErrorCallback?.(error as Error)
      throw error
    }
  }

  disconnectPeer(peerId: string): void {
    this.handler.closePeerConnection(peerId)
    this.connectionStatuses.delete(peerId)
    this.onPeerDisconnectedCallback?.(peerId)
  }

  disconnectAll(): void {
    this.handler.closeAllConnections()
    this.connectionStatuses.clear()
  }

  sendChatMessage(text: string, targetPeerId?: string): void {
    const message: ChatMessage = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `chat_${Date.now()}`,
      type: 'chat',
      senderId: this.config.localPeerId,
      timestamp: Date.now(),
      payload: { text },
    }

    if (targetPeerId) {
      const sent = this.handler.sendMessage(targetPeerId, message)
      if (!sent) {
        this.onErrorCallback?.(new Error(`Failed to send chat message to ${targetPeerId}`))
      }
    } else {
      this.handler.broadcastMessage(message)
    }

    // Emit locally as well
    this.onChatMessageCallback?.(message)
  }

  broadcastSystemMessage(payload: unknown): void {
    const message: PeerMessage = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `system_${Date.now()}`,
      type: 'system',
      senderId: this.config.localPeerId,
      timestamp: Date.now(),
      payload,
    }

    this.handler.broadcastMessage(message)
  }

  getConnectedPeers(): string[] {
    return this.handler.getConnectedPeers()
  }

  getConnectionStatus(peerId: string): ConnectionStatus | undefined {
    return this.connectionStatuses.get(peerId)
  }

  getRemoteStream(peerId: string): MediaStream | null {
    return this.handler.getRemoteStream(peerId)
  }

  onPeerConnected(callback: (peerId: string) => void): void {
    this.onPeerConnectedCallback = callback
  }

  onPeerDisconnected(callback: (peerId: string) => void): void {
    this.onPeerDisconnectedCallback = callback
  }

  onChatMessage(callback: (message: ChatMessage) => void): void {
    this.onChatMessageCallback = callback
  }

  onRemoteStream(callback: (peerId: string, stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback
  }

  onIceCandidate(callback: (peerId: string, candidate: RTCIceCandidate) => void): void {
    this.onIceCandidateCallback = callback
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback
  }

  destroy(): void {
    this.disconnectAll()
  }

  private handleIncomingMessage(_peerId: string, message: PeerMessage): void {
    if (message.type === 'chat') {
      this.onChatMessageCallback?.(message as ChatMessage)
      return
    }

    if (message.type === 'system') {
      // System messages are surfaced as-is to consumers
      this.onChatMessageCallback?.(message as ChatMessage)
      return
    }
  }

  private handleConnectionChange(peerId: string, status: ConnectionStatus): void {
    if (status === ConnectionStatus.CONNECTED) {
      this.onPeerConnectedCallback?.(peerId)
    }

    if (status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.FAILED) {
      this.onPeerDisconnectedCallback?.(peerId)
    }
  }
}