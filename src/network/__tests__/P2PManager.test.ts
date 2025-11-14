import { describe, it, expect, vi, beforeEach } from 'vitest'
import { P2PManager } from '@/network/P2PManager'
import { ConnectionStatus } from '@/network/types'

type TestMessage = {
  payload: { text: string }
  [key: string]: unknown
}

type HandlerInstance = {
  setLocalStream: ReturnType<typeof vi.fn>
  clearLocalStream: ReturnType<typeof vi.fn>
  createPeerConnection: ReturnType<typeof vi.fn>
  createDataChannel: ReturnType<typeof vi.fn>
  createOffer: ReturnType<typeof vi.fn>
  createAnswer: ReturnType<typeof vi.fn>
  setRemoteDescription: ReturnType<typeof vi.fn>
  addIceCandidate: ReturnType<typeof vi.fn>
  sendMessage: ReturnType<typeof vi.fn>
  broadcastMessage: ReturnType<typeof vi.fn>
  closePeerConnection: ReturnType<typeof vi.fn>
  closeAllConnections: ReturnType<typeof vi.fn>
  getConnectedPeers: ReturnType<typeof vi.fn>
  getConnectionStatus: ReturnType<typeof vi.fn>
  getRemoteStream: ReturnType<typeof vi.fn>
  emitMessage(peerId: string, message: TestMessage): void
  emitConnectionStatus(peerId: string, status: ConnectionStatus): void
  emitRemoteStream(peerId: string, stream: MediaStream): void
  emitIceCandidate(peerId: string, candidate: RTCIceCandidate): void
}

interface HandlerState {
  instances: HandlerInstance[]
  getLatest(): HandlerInstance
  reset(): void
}

function ensureHandlerState(): HandlerState {
  const key = '__p2pHandlerState__'
  const globalAny = globalThis as Record<string, unknown>

  if (!globalAny[key]) {
    const state: HandlerState = {
      instances: [],
      getLatest() {
        const instance = this.instances[this.instances.length - 1]
        if (!instance) {
          throw new Error('No handler instance available')
        }
        return instance
      },
      reset() {
        this.instances.length = 0
      },
    }
    globalAny[key] = state
  }

  return globalAny[key] as HandlerState
}

vi.mock('../connection/WebRTCHandler', () => {
  const state = ensureHandlerState()

  class MockWebRTCHandler {
    public setLocalStream!: ReturnType<typeof vi.fn>
    public clearLocalStream!: ReturnType<typeof vi.fn>
    public createPeerConnection!: ReturnType<typeof vi.fn>
    public createDataChannel!: ReturnType<typeof vi.fn>
    public createOffer!: ReturnType<typeof vi.fn>
    public createAnswer!: ReturnType<typeof vi.fn>
    public setRemoteDescription!: ReturnType<typeof vi.fn>
    public addIceCandidate!: ReturnType<typeof vi.fn>
    public sendMessage!: ReturnType<typeof vi.fn>
    public broadcastMessage!: ReturnType<typeof vi.fn>
    public closePeerConnection!: ReturnType<typeof vi.fn>
    public closeAllConnections!: ReturnType<typeof vi.fn>
    public getConnectedPeers!: ReturnType<typeof vi.fn>
    public getConnectionStatus!: ReturnType<typeof vi.fn>
    public getRemoteStream!: ReturnType<typeof vi.fn>

    public localStream: unknown = null
    private readonly connectedPeers = new Set<string>()
    private readonly remoteStreams = new Map<string, MediaStream>()
    private messageCallback?: (peerId: string, message: TestMessage) => void
    private connectionCallback?: (peerId: string, status: ConnectionStatus) => void
    private remoteStreamCallback?: (peerId: string, stream: MediaStream) => void
    private iceCandidateCallback?: (peerId: string, candidate: RTCIceCandidate) => void

    constructor() {
      this.setLocalStream = vi.fn((stream: unknown) => {
        this.localStream = stream
      })

      this.clearLocalStream = vi.fn(() => {
        this.localStream = null
      })

      this.createPeerConnection = vi.fn(async (peerId: string) => {
        this.connectedPeers.add(peerId)
      })

      this.createDataChannel = vi.fn(() => undefined)

      this.createOffer = vi.fn(async (peerId: string) => ({ type: 'offer', sdp: `offer-${peerId}` }))

      this.createAnswer = vi.fn(async (peerId: string) => ({ type: 'answer', sdp: `answer-${peerId}` }))

      this.setRemoteDescription = vi.fn(async () => undefined)

      this.addIceCandidate = vi.fn(async () => undefined)

      this.sendMessage = vi.fn(() => true)

      this.broadcastMessage = vi.fn(() => undefined)

      this.closePeerConnection = vi.fn((peerId: string) => {
        this.connectedPeers.delete(peerId)
      })

      this.closeAllConnections = vi.fn(() => {
        this.connectedPeers.clear()
      })

      this.getConnectedPeers = vi.fn(() => Array.from(this.connectedPeers))

      this.getConnectionStatus = vi.fn((peerId: string) =>
        this.connectedPeers.has(peerId) ? ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED,
      )

      this.getRemoteStream = vi.fn((peerId: string) => this.remoteStreams.get(peerId) ?? null)

      this.onMessage = vi.fn((callback: (peerId: string, message: TestMessage) => void) => {
        this.messageCallback = callback
      })

      this.onConnectionChange = vi.fn((callback: (peerId: string, status: ConnectionStatus) => void) => {
        this.connectionCallback = callback
      })

      this.onRemoteStream = vi.fn((callback: (peerId: string, stream: MediaStream) => void) => {
        this.remoteStreamCallback = callback
      })

      this.onIceCandidate = vi.fn((callback: (peerId: string, candidate: RTCIceCandidate) => void) => {
        this.iceCandidateCallback = callback
      })

      state.instances.push(this as unknown as HandlerInstance)
    }

    onMessage!: ReturnType<typeof vi.fn>
    onConnectionChange!: ReturnType<typeof vi.fn>
    onRemoteStream!: ReturnType<typeof vi.fn>
    onIceCandidate!: ReturnType<typeof vi.fn>

    emitMessage(peerId: string, message: TestMessage): void {
      this.messageCallback?.(peerId, message)
    }

    emitConnectionStatus(peerId: string, status: ConnectionStatus): void {
      if (status === ConnectionStatus.CONNECTED) {
        this.connectedPeers.add(peerId)
      } else {
        this.connectedPeers.delete(peerId)
      }
      this.connectionCallback?.(peerId, status)
    }

    emitRemoteStream(peerId: string, stream: MediaStream): void {
      this.remoteStreams.set(peerId, stream)
      this.remoteStreamCallback?.(peerId, stream)
    }

    emitIceCandidate(peerId: string, candidate: RTCIceCandidate): void {
      this.iceCandidateCallback?.(peerId, candidate)
    }
  }

  return { WebRTCHandler: MockWebRTCHandler }
})

function latestHandler(): HandlerInstance {
  return ensureHandlerState().getLatest()
}

describe('P2PManager', () => {
  const localPeerId = 'local-peer'
  let manager: P2PManager

  beforeEach(() => {
    vi.clearAllMocks()
    ensureHandlerState().reset()
    manager = new P2PManager({ localPeerId })
  })

  it('sets and clears the local media stream', () => {
    const handler = latestHandler()
    const stream = { id: 'stream' } as unknown as MediaStream
    manager.setLocalStream(stream)
    expect(handler.setLocalStream).toHaveBeenCalledWith(stream)

    manager.clearLocalStream()
    expect(handler.clearLocalStream).toHaveBeenCalled()
  })

  it('creates an offer when initiating a connection', async () => {
    const handler = latestHandler()
    handler.createOffer.mockResolvedValueOnce({ type: 'offer', sdp: 'custom-offer' })

    const offer = await manager.createOffer('peer-1')

    expect(handler.createPeerConnection).toHaveBeenCalledWith('peer-1')
    expect(handler.createDataChannel).toHaveBeenCalledWith('peer-1')
    expect(handler.createOffer).toHaveBeenCalledWith('peer-1')
    expect(offer).toEqual({ type: 'offer', sdp: 'custom-offer' })
  })

  it('handles an incoming offer and returns an answer', async () => {
    const handler = latestHandler()
    handler.createAnswer.mockResolvedValueOnce({ type: 'answer', sdp: 'custom-answer' })

    const answer = await manager.handleOffer('peer-2', { type: 'offer', sdp: 'incoming' })

    expect(handler.createPeerConnection).toHaveBeenCalledWith('peer-2')
    expect(handler.setRemoteDescription).toHaveBeenCalledWith('peer-2', { type: 'offer', sdp: 'incoming' })
    expect(handler.createAnswer).toHaveBeenCalledWith('peer-2')
    expect(answer).toEqual({ type: 'answer', sdp: 'custom-answer' })
  })

  it('handles an incoming answer', async () => {
    const handler = latestHandler()
    await manager.handleAnswer('peer-3', { type: 'answer', sdp: 'remote' })
    expect(handler.setRemoteDescription).toHaveBeenCalledWith('peer-3', { type: 'answer', sdp: 'remote' })
  })

  it('adds an ICE candidate', async () => {
    const handler = latestHandler()
    await manager.addIceCandidate('peer-4', { candidate: 'test', sdpMid: '0', sdpMLineIndex: 0 })
    expect(handler.addIceCandidate).toHaveBeenCalled()
  })

  it('sends a broadcast chat message', () => {
    const handler = latestHandler()
    const listener = vi.fn()
    manager.onChatMessage(listener)

    manager.sendChatMessage('hello world')

    expect(handler.broadcastMessage).toHaveBeenCalled()
    expect(listener).toHaveBeenCalled()
    expect((listener.mock.calls[0][0] as TestMessage).payload.text).toBe('hello world')
  })

  it('sends a direct chat message to a peer', () => {
    const handler = latestHandler()
    manager.sendChatMessage('hi', 'peer-5')
    expect(handler.sendMessage).toHaveBeenCalledWith('peer-5', expect.objectContaining({ payload: { text: 'hi' } }))
  })

  it('disconnects from a peer', () => {
    const handler = latestHandler()
    manager.disconnectPeer('peer-6')
    expect(handler.closePeerConnection).toHaveBeenCalledWith('peer-6')
  })

  it('disconnects from all peers', () => {
    const handler = latestHandler()
    manager.disconnectAll()
    expect(handler.closeAllConnections).toHaveBeenCalled()
  })

  it('emits peer connection events', () => {
    const handler = latestHandler()
    const connected = vi.fn()
    const disconnected = vi.fn()
    manager.onPeerConnected(connected)
    manager.onPeerDisconnected(disconnected)

    handler.emitConnectionStatus('peer-7', ConnectionStatus.CONNECTED)
    expect(connected).toHaveBeenCalledWith('peer-7')

    handler.emitConnectionStatus('peer-7', ConnectionStatus.DISCONNECTED)
    expect(disconnected).toHaveBeenCalledWith('peer-7')
  })

  it('emits chat messages received over the data channel', () => {
    const handler = latestHandler()
    const listener = vi.fn()
    manager.onChatMessage(listener)

    handler.emitMessage('peer-8', {
      id: 'chat-1',
      type: 'chat',
      senderId: 'peer-8',
      timestamp: Date.now(),
      payload: { text: 'incoming' },
    })

    expect(listener).toHaveBeenCalled()
    expect((listener.mock.calls[0][0] as TestMessage).payload.text).toBe('incoming')
  })

  it('emits remote media streams', () => {
    const handler = latestHandler()
    const listener = vi.fn()
    manager.onRemoteStream(listener)
    const stream = { id: 'stream' } as unknown as MediaStream

    handler.emitRemoteStream('peer-9', stream)

    expect(listener).toHaveBeenCalledWith('peer-9', stream)
  })

  it('forwards ICE candidates to listeners', () => {
    const handler = latestHandler()
    const listener = vi.fn()
    manager.onIceCandidate(listener)
    const candidate = { candidate: 'test', sdpMid: '0', sdpMLineIndex: 0 } as RTCIceCandidate

    handler.emitIceCandidate('peer-10', candidate)

    expect(listener).toHaveBeenCalledWith('peer-10', candidate)
  })

  it('cleans up resources on destroy', () => {
    const handler = latestHandler()
    expect(() => manager.destroy()).not.toThrow()
    expect(handler.closeAllConnections).toHaveBeenCalled()
  })
})

