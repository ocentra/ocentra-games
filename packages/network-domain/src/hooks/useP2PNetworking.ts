import { useState, useEffect, useCallback, useRef } from 'react'
import {
  P2PManager,
  type P2PManagerConfig,
  type ChatMessage,
} from '@/managers/P2PManager'
import type { ConnectionStatus } from '@/types'

export interface UseP2PNetworkingOptions {
  localPeerId: string
  rtcConfiguration?: RTCConfiguration
}

export interface P2PNetworkingState {
  connectedPeers: string[]
  connectionStatuses: Record<string, ConnectionStatus>
  remoteStreams: Record<string, MediaStream>
  messages: ChatMessage[]
  error: Error | null
}

export function useP2PNetworking(options: UseP2PNetworkingOptions) {
  const [state, setState] = useState<P2PNetworkingState>({
    connectedPeers: [],
    connectionStatuses: {},
    remoteStreams: {},
    messages: [],
    error: null,
  })

  const managerRef = useRef<P2PManager | null>(null)

  useEffect(() => {
    const config: P2PManagerConfig = {
      localPeerId: options.localPeerId,
      rtcConfiguration: options.rtcConfiguration,
    }

    const manager = new P2PManager(config)
    managerRef.current = manager

    manager.onPeerConnected((peerId) => {
      setState(prev => ({
        ...prev,
        connectedPeers: [...new Set([...prev.connectedPeers, peerId])],
      }))
    })

    manager.onPeerDisconnected((peerId) => {
      setState(prev => {
        const restStatus = { ...prev.connectionStatuses }
        delete restStatus[peerId]

        const restStreams = { ...prev.remoteStreams }
        delete restStreams[peerId]

        return {
          ...prev,
          connectedPeers: prev.connectedPeers.filter(id => id !== peerId),
          connectionStatuses: restStatus,
          remoteStreams: restStreams,
        }
      })
    })

    manager.onChatMessage((message) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
      }))
    })

    manager.onRemoteStream((peerId, stream) => {
      setState(prev => ({
        ...prev,
        remoteStreams: {
          ...prev.remoteStreams,
          [peerId]: stream,
        },
      }))
    })

    manager.onError((error) => {
      setState(prev => ({
        ...prev,
        error,
      }))
    })

    return () => {
      manager.destroy()
      managerRef.current = null
    }
  }, [options.localPeerId, options.rtcConfiguration])

  const withManager = useCallback(<T,>(fn: (manager: P2PManager) => T): T => {
    const manager = managerRef.current
    if (!manager) {
      throw new Error('P2P Manager not initialized')
    }
    return fn(manager)
  }, [])

  const setLocalStream = useCallback((stream: MediaStream) => {
    withManager(manager => manager.setLocalStream(stream))
  }, [withManager])

  const clearLocalStream = useCallback(() => {
    withManager(manager => manager.clearLocalStream())
  }, [withManager])

  const createOffer = useCallback(async (peerId: string) => {
    return await withManager(manager => manager.createOffer(peerId))
  }, [withManager])

  const handleOffer = useCallback(async (peerId: string, offer: RTCSessionDescriptionInit) => {
    return await withManager(manager => manager.handleOffer(peerId, offer))
  }, [withManager])

  const handleAnswer = useCallback(async (peerId: string, answer: RTCSessionDescriptionInit) => {
    await withManager(manager => manager.handleAnswer(peerId, answer))
  }, [withManager])

  const addIceCandidate = useCallback(async (peerId: string, candidate: RTCIceCandidateInit) => {
    await withManager(manager => manager.addIceCandidate(peerId, candidate))
  }, [withManager])

  const sendChatMessage = useCallback((text: string, peerId?: string) => {
    withManager(manager => manager.sendChatMessage(text, peerId))
  }, [withManager])

  const disconnectPeer = useCallback((peerId: string) => {
    withManager(manager => manager.disconnectPeer(peerId))
  }, [withManager])

  const disconnectAll = useCallback(() => {
    withManager(manager => manager.disconnectAll())
    setState(prev => ({
      ...prev,
      connectedPeers: [],
      connectionStatuses: {},
      remoteStreams: {},
    }))
  }, [withManager])

  const getConnectionStatus = useCallback((peerId: string) => {
    return withManager(manager => manager.getConnectionStatus(peerId))
  }, [withManager])

  const getRemoteStream = useCallback((peerId: string) => {
    return withManager(manager => manager.getRemoteStream(peerId))
  }, [withManager])

  const onIceCandidate = useCallback((callback: (peerId: string, candidate: RTCIceCandidate) => void) => {
    withManager(manager => manager.onIceCandidate(callback))
  }, [withManager])

  return {
    state,
    setLocalStream,
    clearLocalStream,
    createOffer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    sendChatMessage,
    disconnectPeer,
    disconnectAll,
    getConnectionStatus,
    getRemoteStream,
    onIceCandidate,
  }
}
