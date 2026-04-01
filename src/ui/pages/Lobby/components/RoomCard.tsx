import type { LobbyRoom } from '@ocentra/api-domain/multiplayer';

interface RoomCardProps {
  room: LobbyRoom;
  busy: boolean;
  onJoin: (roomId: string) => void;
  onLeave: (roomId: string) => void;
}

export function RoomCard({ room, busy, onJoin, onLeave }: RoomCardProps) {
  return (
    <article className="lb-room-card">
      <div className="lb-room-header">
        <h3 className="lb-room-id">{room.roomId}</h3>
        <span className="lb-room-type">{room.roomType ?? 'public'}</span>
      </div>

      <div className="lb-room-meta">
        <span>Game: {room.gameType ?? '-'}</span>
        <span>Players: {room.currentPlayers ?? 0}/{room.maxPlayers ?? 0}</span>
        <span>Status: {room.gameStatus ?? 'open'}</span>
      </div>

      <div className="lb-room-actions">
        <button
          type="button"
          className="lb-btn lb-btn-primary"
          onClick={() => onJoin(room.roomId)}
          disabled={busy}
        >
          Join
        </button>
        <button
          type="button"
          className="lb-btn lb-btn-secondary"
          onClick={() => onLeave(room.roomId)}
          disabled={busy}
        >
          Leave
        </button>
      </div>
    </article>
  );
}
