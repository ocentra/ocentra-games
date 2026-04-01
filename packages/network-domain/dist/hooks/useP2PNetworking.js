import { useState, useEffect, useCallback, useRef } from 'react';
import { P2PManager, } from '../managers/P2PManager.js';
export function useP2PNetworking(options) {
    const [state, setState] = useState({
        connectedPeers: [],
        connectionStatuses: {},
        remoteStreams: {},
        messages: [],
        error: null,
    });
    const managerRef = useRef(null);
    useEffect(() => {
        const config = {
            localPeerId: options.localPeerId,
            rtcConfiguration: options.rtcConfiguration,
        };
        const manager = new P2PManager(config);
        managerRef.current = manager;
        manager.onPeerConnected((peerId) => {
            setState(prev => ({
                ...prev,
                connectedPeers: [...new Set([...prev.connectedPeers, peerId])],
            }));
        });
        manager.onPeerDisconnected((peerId) => {
            setState(prev => {
                const restStatus = { ...prev.connectionStatuses };
                delete restStatus[peerId];
                const restStreams = { ...prev.remoteStreams };
                delete restStreams[peerId];
                return {
                    ...prev,
                    connectedPeers: prev.connectedPeers.filter(id => id !== peerId),
                    connectionStatuses: restStatus,
                    remoteStreams: restStreams,
                };
            });
        });
        manager.onChatMessage((message) => {
            setState(prev => ({
                ...prev,
                messages: [...prev.messages, message],
            }));
        });
        manager.onRemoteStream((peerId, stream) => {
            setState(prev => ({
                ...prev,
                remoteStreams: {
                    ...prev.remoteStreams,
                    [peerId]: stream,
                },
            }));
        });
        manager.onError((error) => {
            setState(prev => ({
                ...prev,
                error,
            }));
        });
        return () => {
            manager.destroy();
            managerRef.current = null;
        };
    }, [options.localPeerId, options.rtcConfiguration]);
    const withManager = useCallback((fn) => {
        const manager = managerRef.current;
        if (!manager) {
            throw new Error('P2P Manager not initialized');
        }
        return fn(manager);
    }, []);
    const setLocalStream = useCallback((stream) => {
        withManager(manager => manager.setLocalStream(stream));
    }, [withManager]);
    const clearLocalStream = useCallback(() => {
        withManager(manager => manager.clearLocalStream());
    }, [withManager]);
    const createOffer = useCallback(async (peerId) => {
        return await withManager(manager => manager.createOffer(peerId));
    }, [withManager]);
    const handleOffer = useCallback(async (peerId, offer) => {
        return await withManager(manager => manager.handleOffer(peerId, offer));
    }, [withManager]);
    const handleAnswer = useCallback(async (peerId, answer) => {
        await withManager(manager => manager.handleAnswer(peerId, answer));
    }, [withManager]);
    const addIceCandidate = useCallback(async (peerId, candidate) => {
        await withManager(manager => manager.addIceCandidate(peerId, candidate));
    }, [withManager]);
    const sendChatMessage = useCallback((text, peerId) => {
        withManager(manager => manager.sendChatMessage(text, peerId));
    }, [withManager]);
    const disconnectPeer = useCallback((peerId) => {
        withManager(manager => manager.disconnectPeer(peerId));
    }, [withManager]);
    const disconnectAll = useCallback(() => {
        withManager(manager => manager.disconnectAll());
        setState(prev => ({
            ...prev,
            connectedPeers: [],
            connectionStatuses: {},
            remoteStreams: {},
        }));
    }, [withManager]);
    const getConnectionStatus = useCallback((peerId) => {
        return withManager(manager => manager.getConnectionStatus(peerId));
    }, [withManager]);
    const getRemoteStream = useCallback((peerId) => {
        return withManager(manager => manager.getRemoteStream(peerId));
    }, [withManager]);
    const onIceCandidate = useCallback((callback) => {
        withManager(manager => manager.onIceCandidate(callback));
    }, [withManager]);
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
    };
}
