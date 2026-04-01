import { ConnectionStatus } from '../types.js';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
const log = MainAppLogger.instance;
export class WebRTCHandler {
    peers = new Map();
    localId;
    localStream = null;
    onMessageCallback;
    onConnectionChangeCallback;
    onRemoteStreamCallback;
    onIceCandidateCallback;
    configuration;
    constructor(localId, config) {
        this.localId = localId;
        this.configuration = config ?? {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
            iceCandidatePoolSize: 10,
        };
    }
    setLocalStream(stream) {
        this.localStream = stream;
        this.peers.forEach((peer) => {
            stream.getTracks().forEach((track) => {
                peer.connection.addTrack(track, stream);
            });
        });
    }
    clearLocalStream() {
        this.localStream = null;
    }
    async createPeerConnection(peerId) {
        const connection = new RTCPeerConnection(this.configuration);
        const peerConnection = {
            id: peerId,
            connection,
            dataChannel: null,
            status: ConnectionStatus.CONNECTING,
            remoteStream: null,
        };
        this.attachLocalMedia(peerConnection);
        this.setupConnectionHandlers(peerConnection);
        this.peers.set(peerId, peerConnection);
        return connection;
    }
    createDataChannel(peerId, channelName = 'chat') {
        const peer = this.peers.get(peerId);
        if (!peer)
            return null;
        const dataChannel = peer.connection.createDataChannel(channelName, {
            ordered: true,
        });
        peer.dataChannel = dataChannel;
        this.setupDataChannelHandlers(peer, dataChannel);
        return dataChannel;
    }
    async createOffer(peerId) {
        const peer = this.peers.get(peerId);
        if (!peer) {
            throw new Error(`Peer ${peerId} not found`);
        }
        const offer = await peer.connection.createOffer();
        await peer.connection.setLocalDescription(offer);
        return offer;
    }
    async createAnswer(peerId) {
        const peer = this.peers.get(peerId);
        if (!peer) {
            throw new Error(`Peer ${peerId} not found`);
        }
        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);
        return answer;
    }
    async setRemoteDescription(peerId, description) {
        const peer = this.peers.get(peerId);
        if (!peer) {
            throw new Error(`Peer ${peerId} not found`);
        }
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`setRemoteDescription timeout for peer ${peerId}`)), 3000);
        });
        try {
            await Promise.race([
                peer.connection.setRemoteDescription(description),
                timeoutPromise,
            ]);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            log.logError(`Failed to set remote description for peer ${peerId}:`, getStackTrace(), errorMessage);
            throw error;
        }
    }
    async addIceCandidate(peerId, candidate) {
        const peer = this.peers.get(peerId);
        if (!peer) {
            throw new Error(`Peer ${peerId} not found`);
        }
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
    sendMessage(peerId, message) {
        const peer = this.peers.get(peerId);
        if (!peer?.dataChannel || peer.dataChannel.readyState !== 'open') {
            return false;
        }
        try {
            peer.dataChannel.send(JSON.stringify(message));
            return true;
        }
        catch (error) {
            log.logError(`Failed to send message to peer ${peerId}:`, getStackTrace(), error);
            return false;
        }
    }
    broadcastMessage(message) {
        this.peers.forEach((_, peerId) => {
            this.sendMessage(peerId, message);
        });
    }
    closePeerConnection(peerId) {
        const peer = this.peers.get(peerId);
        if (!peer)
            return;
        peer.dataChannel?.close();
        peer.connection.close();
        this.peers.delete(peerId);
    }
    closeAllConnections() {
        this.peers.forEach((_, peerId) => {
            this.closePeerConnection(peerId);
        });
    }
    getConnectionStatus(peerId) {
        return this.peers.get(peerId)?.status ?? null;
    }
    getConnectedPeers() {
        return Array.from(this.peers.entries())
            .filter(([, peer]) => peer.status === ConnectionStatus.CONNECTED)
            .map(([peerId]) => peerId);
    }
    getRemoteStream(peerId) {
        return this.peers.get(peerId)?.remoteStream ?? null;
    }
    onMessage(callback) {
        this.onMessageCallback = callback;
    }
    onConnectionChange(callback) {
        this.onConnectionChangeCallback = callback;
    }
    onRemoteStream(callback) {
        this.onRemoteStreamCallback = callback;
    }
    onIceCandidate(callback) {
        this.onIceCandidateCallback = callback;
    }
    attachLocalMedia(peer) {
        if (!this.localStream)
            return;
        this.localStream.getTracks().forEach((track) => {
            peer.connection.addTrack(track, this.localStream);
        });
    }
    setupConnectionHandlers(peer) {
        const { connection } = peer;
        connection.oniceconnectionstatechange = () => {
            this.handleConnectionStateChange(peer);
        };
        connection.ondatachannel = (event) => {
            this.handleIncomingDataChannel(peer, event);
        };
        connection.onicecandidate = (event) => {
            if (event.candidate) {
                this.onIceCandidateCallback?.(peer.id, event.candidate);
            }
        };
        connection.ontrack = (event) => {
            const [stream] = event.streams;
            if (stream) {
                peer.remoteStream = stream;
                this.onRemoteStreamCallback?.(peer.id, stream);
            }
        };
    }
    handleIncomingDataChannel(peer, event) {
        const dataChannel = event.channel;
        peer.dataChannel = dataChannel;
        this.setupDataChannelHandlers(peer, dataChannel);
    }
    setupDataChannelHandlers(peer, dataChannel) {
        dataChannel.onopen = () => {
            peer.status = ConnectionStatus.CONNECTED;
            this.onConnectionChangeCallback?.(peer.id, peer.status);
        };
        dataChannel.onclose = () => {
            peer.status = ConnectionStatus.DISCONNECTED;
            this.onConnectionChangeCallback?.(peer.id, peer.status);
        };
        dataChannel.onerror = (error) => {
            log.logError(`Data channel error for peer ${peer.id}:`, getStackTrace(), error);
            peer.status = ConnectionStatus.FAILED;
            this.onConnectionChangeCallback?.(peer.id, peer.status);
        };
        dataChannel.onmessage = (event) => {
            this.handleIncomingMessage(peer, event.data);
        };
    }
    handleConnectionStateChange(peer) {
        const state = peer.connection.iceConnectionState;
        switch (state) {
            case 'connected':
            case 'completed':
                peer.status = ConnectionStatus.CONNECTED;
                break;
            case 'disconnected':
                peer.status = ConnectionStatus.DISCONNECTED;
                break;
            case 'failed':
                peer.status = ConnectionStatus.FAILED;
                break;
            default:
                peer.status = ConnectionStatus.CONNECTING;
                break;
        }
        this.onConnectionChangeCallback?.(peer.id, peer.status);
    }
    handleIncomingMessage(peer, data) {
        try {
            const message = JSON.parse(data);
            if (message.type === 'ping') {
                const pong = {
                    id: `pong_${Date.now()}`,
                    type: 'pong',
                    senderId: this.localId,
                    timestamp: Date.now(),
                };
                this.sendMessage(peer.id, pong);
                return;
            }
            this.onMessageCallback?.(peer.id, message);
        }
        catch (error) {
            log.logError('Failed to parse incoming message:', getStackTrace(), error);
        }
    }
}
