import { WebRTCHandler } from '../connection/WebRTCHandler.js';
import { ConnectionStatus } from '../types.js';
export class P2PManager {
    config;
    handler;
    connectionStatuses = new Map();
    onPeerConnectedCallback;
    onPeerDisconnectedCallback;
    onChatMessageCallback;
    onRemoteStreamCallback;
    onIceCandidateCallback;
    onErrorCallback;
    localStream = null;
    constructor(config) {
        this.config = config;
        this.handler = new WebRTCHandler(config.localPeerId, config.rtcConfiguration);
        this.handler.onMessage((peerId, message) => {
            this.handleIncomingMessage(peerId, message);
        });
        this.handler.onConnectionChange((peerId, status) => {
            this.connectionStatuses.set(peerId, status);
            this.handleConnectionChange(peerId, status);
        });
        this.handler.onRemoteStream((peerId, stream) => {
            this.onRemoteStreamCallback?.(peerId, stream);
        });
        this.handler.onIceCandidate((peerId, candidate) => {
            this.onIceCandidateCallback?.(peerId, candidate);
        });
    }
    setLocalStream(stream) {
        this.localStream = stream;
        this.handler.setLocalStream(stream);
    }
    clearLocalStream() {
        this.localStream = null;
        this.handler.clearLocalStream();
    }
    async createOffer(peerId) {
        try {
            if (!this.connectionStatuses.has(peerId)) {
                await this.handler.createPeerConnection(peerId);
                this.connectionStatuses.set(peerId, ConnectionStatus.CONNECTING);
                if (this.localStream) {
                    this.handler.setLocalStream(this.localStream);
                }
                this.handler.createDataChannel(peerId);
            }
            return await this.handler.createOffer(peerId);
        }
        catch (error) {
            this.onErrorCallback?.(error);
            throw error;
        }
    }
    async handleOffer(peerId, offer) {
        try {
            if (!this.connectionStatuses.has(peerId)) {
                await this.handler.createPeerConnection(peerId);
                this.connectionStatuses.set(peerId, ConnectionStatus.CONNECTING);
                if (this.localStream) {
                    this.handler.setLocalStream(this.localStream);
                }
            }
            await this.handler.setRemoteDescription(peerId, offer);
            return await this.handler.createAnswer(peerId);
        }
        catch (error) {
            this.onErrorCallback?.(error);
            throw error;
        }
    }
    async handleAnswer(peerId, answer) {
        try {
            await this.handler.setRemoteDescription(peerId, answer);
        }
        catch (error) {
            this.onErrorCallback?.(error);
            throw error;
        }
    }
    async addIceCandidate(peerId, candidate) {
        try {
            await this.handler.addIceCandidate(peerId, candidate);
        }
        catch (error) {
            this.onErrorCallback?.(error);
            throw error;
        }
    }
    disconnectPeer(peerId) {
        this.handler.closePeerConnection(peerId);
        this.connectionStatuses.delete(peerId);
        this.onPeerDisconnectedCallback?.(peerId);
    }
    disconnectAll() {
        this.handler.closeAllConnections();
        this.connectionStatuses.clear();
    }
    sendChatMessage(text, targetPeerId) {
        const message = {
            id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `chat_${Date.now()}`,
            type: 'chat',
            senderId: this.config.localPeerId,
            timestamp: Date.now(),
            payload: { text },
        };
        if (targetPeerId) {
            const sent = this.handler.sendMessage(targetPeerId, message);
            if (!sent) {
                this.onErrorCallback?.(new Error(`Failed to send chat message to ${targetPeerId}`));
            }
        }
        else {
            this.handler.broadcastMessage(message);
        }
        this.onChatMessageCallback?.(message);
    }
    broadcastSystemMessage(payload) {
        const message = {
            id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `system_${Date.now()}`,
            type: 'system',
            senderId: this.config.localPeerId,
            timestamp: Date.now(),
            payload,
        };
        this.handler.broadcastMessage(message);
    }
    getConnectedPeers() {
        return this.handler.getConnectedPeers();
    }
    getConnectionStatus(peerId) {
        return this.connectionStatuses.get(peerId);
    }
    getRemoteStream(peerId) {
        return this.handler.getRemoteStream(peerId);
    }
    onPeerConnected(callback) {
        this.onPeerConnectedCallback = callback;
    }
    onPeerDisconnected(callback) {
        this.onPeerDisconnectedCallback = callback;
    }
    onChatMessage(callback) {
        this.onChatMessageCallback = callback;
    }
    onRemoteStream(callback) {
        this.onRemoteStreamCallback = callback;
    }
    onIceCandidate(callback) {
        this.onIceCandidateCallback = callback;
    }
    onError(callback) {
        this.onErrorCallback = callback;
    }
    destroy() {
        this.disconnectAll();
    }
    handleIncomingMessage(_peerId, message) {
        if (message.type === 'chat') {
            this.onChatMessageCallback?.(message);
            return;
        }
        if (message.type === 'system') {
            this.onChatMessageCallback?.(message);
            return;
        }
    }
    handleConnectionChange(peerId, status) {
        if (status === ConnectionStatus.CONNECTED) {
            this.onPeerConnectedCallback?.(peerId);
        }
        if (status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.FAILED) {
            this.onPeerDisconnectedCallback?.(peerId);
        }
    }
}
