import { ConnectionStatus } from '../types';
import type { PeerMessage, ChatMessagePayload } from '../types';
export interface P2PManagerConfig {
    localPeerId: string;
    rtcConfiguration?: RTCConfiguration;
}
export type ChatMessage = PeerMessage<ChatMessagePayload>;
export declare class P2PManager {
    private readonly config;
    private readonly handler;
    private connectionStatuses;
    private onPeerConnectedCallback?;
    private onPeerDisconnectedCallback?;
    private onChatMessageCallback?;
    private onRemoteStreamCallback?;
    private onIceCandidateCallback?;
    private onErrorCallback?;
    private localStream;
    constructor(config: P2PManagerConfig);
    setLocalStream(stream: MediaStream): void;
    clearLocalStream(): void;
    createOffer(peerId: string): Promise<RTCSessionDescriptionInit>;
    handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit>;
    handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void>;
    addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void>;
    disconnectPeer(peerId: string): void;
    disconnectAll(): void;
    sendChatMessage(text: string, targetPeerId?: string): void;
    broadcastSystemMessage(payload: unknown): void;
    getConnectedPeers(): string[];
    getConnectionStatus(peerId: string): ConnectionStatus | undefined;
    getRemoteStream(peerId: string): MediaStream | null;
    onPeerConnected(callback: (peerId: string) => void): void;
    onPeerDisconnected(callback: (peerId: string) => void): void;
    onChatMessage(callback: (message: ChatMessage) => void): void;
    onRemoteStream(callback: (peerId: string, stream: MediaStream) => void): void;
    onIceCandidate(callback: (peerId: string, candidate: RTCIceCandidate) => void): void;
    onError(callback: (error: Error) => void): void;
    destroy(): void;
    private handleIncomingMessage;
    private handleConnectionChange;
}
