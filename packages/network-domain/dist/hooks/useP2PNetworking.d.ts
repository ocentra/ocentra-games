import { type ChatMessage } from '../managers/P2PManager';
import type { ConnectionStatus } from '../types';
export interface UseP2PNetworkingOptions {
    localPeerId: string;
    rtcConfiguration?: RTCConfiguration;
}
export interface P2PNetworkingState {
    connectedPeers: string[];
    connectionStatuses: Record<string, ConnectionStatus>;
    remoteStreams: Record<string, MediaStream>;
    messages: ChatMessage[];
    error: Error | null;
}
export declare function useP2PNetworking(options: UseP2PNetworkingOptions): {
    state: P2PNetworkingState;
    setLocalStream: (stream: MediaStream) => void;
    clearLocalStream: () => void;
    createOffer: (peerId: string) => Promise<RTCSessionDescriptionInit>;
    handleOffer: (peerId: string, offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>;
    handleAnswer: (peerId: string, answer: RTCSessionDescriptionInit) => Promise<void>;
    addIceCandidate: (peerId: string, candidate: RTCIceCandidateInit) => Promise<void>;
    sendChatMessage: (text: string, peerId?: string) => void;
    disconnectPeer: (peerId: string) => void;
    disconnectAll: () => void;
    getConnectionStatus: (peerId: string) => ConnectionStatus | undefined;
    getRemoteStream: (peerId: string) => MediaStream | null;
    onIceCandidate: (callback: (peerId: string, candidate: RTCIceCandidate) => void) => void;
};
