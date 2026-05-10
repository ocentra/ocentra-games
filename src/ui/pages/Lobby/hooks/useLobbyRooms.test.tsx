import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildLobbyRoomWebSocketUrl,
  createLobbyRoom,
  joinLobbyRoom,
  leaveLobbyRoom,
  listLobbyRooms,
  quickJoinLobbyRoom,
  readyLobbyRoom,
  spectateLobbyRoom,
  startLobbyRoom,
  unreadyLobbyRoom,
} from '@ocentra/api-domain/multiplayer';
import { useLobbyRooms } from './useLobbyRooms';
import { createDefaultLobbyRoomForm } from '@/ui/pages/Lobby/types';

vi.mock('@ocentra/api-domain/multiplayer', () => ({
  buildLobbyRoomWebSocketUrl: vi.fn(),
  createLobbyRoom: vi.fn(),
  joinLobbyRoom: vi.fn(),
  leaveLobbyRoom: vi.fn(),
  listLobbyRooms: vi.fn(),
  quickJoinLobbyRoom: vi.fn(),
  readyLobbyRoom: vi.fn(),
  spectateLobbyRoom: vi.fn(),
  startLobbyRoom: vi.fn(),
  unreadyLobbyRoom: vi.fn(),
}));

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly sent: string[] = [];
  readonly url: string;
  readyState = FakeWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    sockets.push(this);
    queueMicrotask(() => {
      this.readyState = FakeWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    });
  }

  send(message: string): void {
    this.sent.push(message);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  emit(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
}

const sockets: FakeWebSocket[] = [];
const room = {
  roomId: 'room-1',
  hostId: 'user-1',
  roomName: 'Claim Table',
  gameType: 'claim',
  gameStatus: 'waiting',
  maxPlayers: 2,
  currentPlayers: 1,
  players: [
    { userId: 'user-1', displayName: 'Host', seatIndex: 0, isHost: true, isReady: false },
  ],
  viewerJoined: true,
};

describe('useLobbyRooms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sockets.length = 0;
    window.sessionStorage.clear();
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    vi.mocked(buildLobbyRoomWebSocketUrl).mockReturnValue('ws://localhost/ws/lobby?gameType=claim&roomId=room-1');
    vi.mocked(listLobbyRooms).mockResolvedValue({ rooms: [], limit: 40, nextCursor: null });
    vi.mocked(createLobbyRoom).mockResolvedValue({ joined: true, created: true, roomId: room.roomId, room });
    vi.mocked(joinLobbyRoom).mockResolvedValue({ joined: true, roomId: room.roomId, room });
    vi.mocked(quickJoinLobbyRoom).mockResolvedValue({ joined: true, roomId: room.roomId, room });
    vi.mocked(spectateLobbyRoom).mockResolvedValue({ joined: true, spectating: true, roomId: room.roomId, room });
    vi.mocked(leaveLobbyRoom).mockResolvedValue({ left: true, roomId: room.roomId });
    vi.mocked(readyLobbyRoom).mockResolvedValue({
      ready: true,
      roomId: room.roomId,
      room: { ...room, players: [{ ...room.players[0], isReady: true }] },
    });
    vi.mocked(unreadyLobbyRoom).mockResolvedValue({
      ready: false,
      roomId: room.roomId,
      room,
    });
    vi.mocked(startLobbyRoom).mockResolvedValue({
      started: true,
      roomId: room.roomId,
      matchId: 'match-1',
      room: { ...room, gameStatus: 'starting', matchId: 'match-1' },
    });
  });

  it('creates a joined room and opens the shard-aware lobby socket', async () => {
    const { result } = renderHook(() => useLobbyRooms('claim'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createRoom(createDefaultLobbyRoomForm('claim'), 'user-1', 'Host');
    });

    await waitFor(() => expect(sockets).toHaveLength(1));
    expect(result.current.joinedRoom?.roomId).toBe(room.roomId);
    expect(buildLobbyRoomWebSocketUrl).toHaveBeenCalledWith({ gameType: 'claim', roomId: room.roomId });
    expect(JSON.parse(sockets[0].sent[0])).toEqual({
      type: 'join-room',
      payload: { roomId: room.roomId, userId: 'user-1', displayName: 'Host' },
    });
  });

  it('applies socket chat and ready updates without polling', async () => {
    const { result } = renderHook(() => useLobbyRooms('claim'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.createRoom(createDefaultLobbyRoomForm('claim'), 'user-1', 'Host');
    });
    await waitFor(() => expect(sockets).toHaveLength(1));

    act(() => {
      sockets[0].emit({ type: 'welcome', roomId: room.roomId, reconnectToken: 'token-1', room });
      sockets[0].emit({
        type: 'chat',
        message: { senderId: 'user-2', senderName: 'Guest', content: 'ready for claim', timestamp: Date.now() },
      });
      sockets[0].emit({
        type: 'ready-changed',
        userId: 'user-1',
        isReady: true,
        room: { ...room, players: [{ ...room.players[0], isReady: true }] },
      });
    });

    expect(result.current.chatMessages[0]).toMatchObject({ name: 'Guest', msg: 'ready for claim' });
    expect(result.current.joinedRoom?.players?.[0]?.isReady).toBe(true);
    expect(window.sessionStorage.getItem('ocentra:lobby:reconnect:room-1')).toBe('token-1');
  });

  it('sends ready, start, and chat actions through the real contracts', async () => {
    const { result } = renderHook(() => useLobbyRooms('claim'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.createRoom(createDefaultLobbyRoomForm('claim'), 'user-1', 'Host');
    });
    await waitFor(() => expect(sockets).toHaveLength(1));

    await act(async () => {
      await result.current.readyRoom(room.roomId, 'user-1');
    });
    expect(readyLobbyRoom).toHaveBeenCalledWith(room.roomId, { userId: 'user-1' }, { gameType: 'claim' });
    expect(result.current.joinedRoom?.players?.[0]?.isReady).toBe(true);

    act(() => {
      result.current.sendRoomChat(' table check ');
    });
    expect(JSON.parse(sockets[0].sent.at(-1) ?? '{}')).toEqual({ type: 'chat', payload: { content: 'table check' } });

    await act(async () => {
      await result.current.startRoom(room.roomId, 'user-1');
    });
    expect(startLobbyRoom).toHaveBeenCalledWith(room.roomId, { userId: 'user-1' }, { gameType: 'claim' });
    expect(result.current.joinedRoom?.gameStatus).toBe('starting');
  });
});
