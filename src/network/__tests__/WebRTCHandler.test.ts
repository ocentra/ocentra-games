import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WebRTCHandler } from '@/network/connection/WebRTCHandler'
import type { PeerMessage } from '@/network/types'

const createdConnections: MockRTCPeerConnection[] = []
const createdChannels: MockRTCDataChannel[] = []

class MockRTCDataChannel extends EventTarget implements Pick<RTCDataChannel, 'close' | 'send' | 'readyState' | 'onopen' | 'onclose' | 'onerror' | 'onmessage'> {
  readyState: RTCDataChannelState = 'connecting'
  onopen: ((this: RTCDataChannel, ev: Event) => void) | null = null
  onclose: ((this: RTCDataChannel, ev: Event) => void) | null = null
  onerror: ((this: RTCDataChannel, ev: Event) => void) | null = null
  onmessage: ((this: RTCDataChannel, ev: MessageEvent<string>) => void) | null = null
  readonly sendMock = vi.fn()
  readonly closeMock = vi.fn()

  constructor() {
    super()
    createdChannels.push(this)
  }

  send(data: string | ArrayBuffer | ArrayBufferView | Blob): void {
    this.sendMock(data)
  }

  close(): void {
    this.closeMock()
  }
}

class MockRTCPeerConnection
  implements
    Pick<
      RTCPeerConnection,
      | 'createDataChannel'
      | 'addTrack'
      | 'createOffer'
      | 'createAnswer'
      | 'setLocalDescription'
      | 'setRemoteDescription'
      | 'addIceCandidate'
      | 'close'
      | 'oniceconnectionstatechange'
      | 'ondatachannel'
      | 'onicecandidate'
      | 'ontrack'
      | 'iceConnectionState'
    >
{
  readonly createDataChannelMock = vi.fn((label: string, options?: RTCDataChannelInit) => {
    void label
    void options
    const channel = new MockRTCDataChannel()
    return channel as unknown as RTCDataChannel
  })

  readonly addTrackMock = vi.fn()
  readonly createOfferMock = vi.fn((options?: RTCOfferOptions) => {
    void options
    return Promise.resolve({ type: 'offer', sdp: 'mock-offer' } as RTCSessionDescriptionInit)
  })
  readonly createAnswerMock = vi.fn((options?: RTCAnswerOptions) => {
    void options
    return Promise.resolve({ type: 'answer', sdp: 'mock-answer' } as RTCSessionDescriptionInit)
  })
  readonly setLocalDescriptionMock = vi.fn((_description?: RTCSessionDescriptionInit) => {
    void _description
    return Promise.resolve()
  })
  readonly setRemoteDescriptionMock = vi.fn((_description?: RTCSessionDescriptionInit) => {
    void _description
    return Promise.resolve()
  })
  readonly addIceCandidateMock = vi.fn((_candidate?: RTCIceCandidate | RTCIceCandidateInit) => {
    void _candidate
    return Promise.resolve()
  })
  readonly closeMock = vi.fn()

  oniceconnectionstatechange: ((this: RTCPeerConnection, ev: Event) => void) | null = null
  ondatachannel: ((this: RTCPeerConnection, ev: RTCDataChannelEvent) => void) | null = null
  onicecandidate: ((this: RTCPeerConnection, ev: RTCPeerConnectionIceEvent) => void) | null = null
  ontrack: ((this: RTCPeerConnection, ev: RTCTrackEvent) => void) | null = null
  iceConnectionState: RTCIceConnectionState = 'new'

  constructor() {
    createdConnections.push(this)
  }

  createDataChannel(label: string, options?: RTCDataChannelInit): RTCDataChannel {
    return this.createDataChannelMock(label, options)
  }

  addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender {
    this.addTrackMock(track, ...streams)
    return {} as RTCRtpSender
  }

  createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>
  createOffer(
    successCallback: RTCSessionDescriptionCallback,
    failureCallback: RTCPeerConnectionErrorCallback,
    options?: RTCOfferOptions
  ): Promise<void>
  createOffer(
    arg1?: RTCOfferOptions | RTCSessionDescriptionCallback,
    arg2?: RTCPeerConnectionErrorCallback,
    arg3?: RTCOfferOptions
  ): Promise<RTCSessionDescriptionInit | void> {
    const promise = this.createOfferMock(typeof arg1 === 'function' ? arg3 : arg1)

    if (typeof arg1 === 'function' && arg2) {
      return promise.then(
        (description) => {
          arg1(description as unknown as RTCSessionDescription)
        },
        (error) => {
          arg2(error)
        }
      )
    }

    return promise
  }

  createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>
  createAnswer(successCallback: RTCSessionDescriptionCallback, failureCallback: RTCPeerConnectionErrorCallback): Promise<void>
  createAnswer(
    arg1?: RTCAnswerOptions | RTCSessionDescriptionCallback,
    arg2?: RTCPeerConnectionErrorCallback
  ): Promise<RTCSessionDescriptionInit | void> {
    const promise = this.createAnswerMock(typeof arg1 === 'function' ? undefined : arg1)

    if (typeof arg1 === 'function' && arg2) {
      return promise.then(
        (description) => {
          arg1(description as unknown as RTCSessionDescription)
        },
        (error) => {
          arg2(error)
        }
      )
    }

    return promise
  }

  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    return this.setLocalDescriptionMock(description) as unknown as Promise<void>
  }

  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    return this.setRemoteDescriptionMock(description) as unknown as Promise<void>
  }

  addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    return this.addIceCandidateMock(candidate) as unknown as Promise<void>
  }

  close(): void {
    this.closeMock()
  }
}

const latestConnection = () => createdConnections[createdConnections.length - 1]
const latestChannel = () => createdChannels[createdChannels.length - 1]

Object.defineProperty(globalThis as Record<string, unknown>, 'RTCPeerConnection', {
  configurable: true,
  writable: true,
  value: MockRTCPeerConnection,
})

Object.defineProperty(globalThis as Record<string, unknown>, 'RTCDataChannel', {
  configurable: true,
  writable: true,
  value: MockRTCDataChannel,
})

Object.defineProperty(globalThis as Record<string, unknown>, 'RTCIceCandidate', {
  configurable: true,
  writable: true,
  value: class RTCIceCandidate {
    readonly init: RTCIceCandidateInit
    constructor(init: RTCIceCandidateInit) {
      this.init = init
    }
  },
})

describe('WebRTCHandler', () => {
  let handler: WebRTCHandler

  beforeEach(() => {
    vi.clearAllMocks()
    createdConnections.length = 0
    createdChannels.length = 0
    handler = new WebRTCHandler('local-peer')
  })

  it('creates peer connections and attaches handlers', async () => {
    const peerId = 'peer-1'
    const created = await handler.createPeerConnection(peerId)

    expect(created).toBeInstanceOf(MockRTCPeerConnection)
    const connection = latestConnection()!
    expect(connection.oniceconnectionstatechange).toBeDefined()
    expect(connection.ondatachannel).toBeDefined()
    expect(connection.onicecandidate).toBeDefined()
  })

  it('attaches local media tracks when setting a stream', async () => {
    const track = { id: 'track-1' } as MediaStreamTrack
    const stream = {
      getTracks: () => [track],
    } as unknown as MediaStream

    handler.setLocalStream(stream)
    await handler.createPeerConnection('peer-2')

    const connection = latestConnection()!
    expect(connection.addTrackMock).toHaveBeenCalledWith(track, stream)
  })

  it('creates data channels for peers', async () => {
    await handler.createPeerConnection('peer-3')
    handler.createDataChannel('peer-3')

    const connection = latestConnection()!
    expect(connection.createDataChannelMock).toHaveBeenCalledWith('chat', { ordered: true })
    const channel = latestChannel()!
    expect(channel.onopen).toBeDefined()
    expect(channel.onmessage).toBeDefined()
  })

  it('creates offers and sets local description', async () => {
    await handler.createPeerConnection('peer-4')
    handler.createDataChannel('peer-4')

    const offer = await handler.createOffer('peer-4')

    const connection = latestConnection()!
    expect(connection.createOfferMock).toHaveBeenCalled()
    expect(connection.setLocalDescriptionMock).toHaveBeenCalledWith(offer)
  })

  it('creates answers for incoming offers', async () => {
    await handler.createPeerConnection('peer-5')
    const offer = { type: 'offer', sdp: 'incoming' } as RTCSessionDescriptionInit
    await handler.setRemoteDescription('peer-5', offer)
    const answer = await handler.createAnswer('peer-5')

    const connection = latestConnection()!
    expect(connection.setRemoteDescriptionMock).toHaveBeenCalledWith(offer)
    expect(connection.createAnswerMock).toHaveBeenCalled()
    expect(connection.setLocalDescriptionMock).toHaveBeenCalledWith(answer)
  })

  it('adds ICE candidates', async () => {
    await handler.createPeerConnection('peer-6')
    const candidate = { candidate: 'candidate', sdpMid: '0', sdpMLineIndex: 0 } as unknown as RTCIceCandidate

    await handler.addIceCandidate('peer-6', candidate)

    const connection = latestConnection()!
    expect(connection.addIceCandidateMock).toHaveBeenCalled()
  })

  it('sends messages over open data channels', async () => {
    await handler.createPeerConnection('peer-7')
    handler.createDataChannel('peer-7')

    const channel = latestChannel()!
    channel.readyState = 'open'
    const message: PeerMessage = {
      id: 'msg-1',
      type: 'chat',
      senderId: 'local-peer',
      timestamp: Date.now(),
      payload: { text: 'hello' },
    }

    const result = handler.sendMessage('peer-7', message)

    expect(result).toBe(true)
    expect(channel.sendMock).toHaveBeenCalledWith(JSON.stringify(message))
  })

  it('broadcasts messages to all peers', async () => {
    await handler.createPeerConnection('peer-8')
    handler.createDataChannel('peer-8')
    const channel = latestChannel()!
    channel.readyState = 'open'

    const message: PeerMessage = {
      id: 'msg-2',
      type: 'system',
      senderId: 'local-peer',
      timestamp: Date.now(),
      payload: { info: 'test' },
    }

    handler.broadcastMessage(message)

    expect(channel.sendMock).toHaveBeenCalledWith(JSON.stringify(message))
  })

  it('tracks connected peers based on channel events', async () => {
    await handler.createPeerConnection('peer-9')
    handler.createDataChannel('peer-9')

    const channel = latestChannel()!
    channel.readyState = 'open'
    if (channel.onopen) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.onopen.call(channel as any, new Event('open'))
    }

    expect(handler.getConnectedPeers()).toContain('peer-9')

    if (channel.onclose) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.onclose.call(channel as any, new Event('close'))
    }
    expect(handler.getConnectedPeers()).not.toContain('peer-9')
  })

  it('invokes message callbacks when receiving data', async () => {
    const listener = vi.fn()
    handler.onMessage(listener)

    await handler.createPeerConnection('peer-10')
    handler.createDataChannel('peer-10')

    const channel = latestChannel()!
    const incoming: PeerMessage = {
      id: 'msg-3',
      type: 'chat',
      senderId: 'peer-10',
      timestamp: Date.now(),
      payload: { text: 'incoming' },
    }

    const onMessage = channel.onmessage as ((event: MessageEvent<string>) => void) | null
    onMessage?.({ data: JSON.stringify(incoming) } as MessageEvent<string>)

    expect(listener).toHaveBeenCalledWith('peer-10', incoming)
  })

  it('invokes remote stream callbacks when tracks arrive', async () => {
    const listener = vi.fn()
    handler.onRemoteStream(listener)

    await handler.createPeerConnection('peer-11')
    const stream = { id: 'remote-stream' } as unknown as MediaStream

    const connection = latestConnection()!
    const onTrack = connection.ontrack as ((event: RTCTrackEvent) => void) | null
    onTrack?.({ streams: [stream] } as unknown as RTCTrackEvent)

    expect(listener).toHaveBeenCalledWith('peer-11', stream)
    expect(handler.getRemoteStream('peer-11')).toBe(stream)
  })

  it('closes individual peer connections', async () => {
    await handler.createPeerConnection('peer-12')
    handler.createDataChannel('peer-12')

    const connection = latestConnection()!
    const channel = latestChannel()!
    handler.closePeerConnection('peer-12')

    expect(channel.closeMock).toHaveBeenCalled()
    expect(connection.closeMock).toHaveBeenCalled()
  })

  it('closes all peer connections', async () => {
    await handler.createPeerConnection('peer-13')
    handler.closeAllConnections()

    const connection = latestConnection()!
    expect(connection.closeMock).toHaveBeenCalled()
  })
})
