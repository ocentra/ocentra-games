import type { LobbyRoom } from '@ocentra/api-domain/multiplayer';
import { RoomCard } from '@/ui/pages/Lobby/components/RoomCard';

interface RoomListProps {
  rooms: LobbyRoom[];
  busyRoomId: string | null;
  onJoin: (roomId: string) => void;
  onLeave: (roomId: string) => void;
}

export function RoomList({ rooms, busyRoomId, onJoin, onLeave }: RoomListProps) {
  if (rooms.length === 0) {
    return <div className="lb-empty">No rooms active. Create a room to start.</div>;
  }

  return (
    <div className="lb-room-list">
      {rooms.map((room) => (
        <RoomCard
          key={room.roomId}
          room={room}
          busy={busyRoomId === room.roomId}
          onJoin={onJoin}
          onLeave={onLeave}
        />
      ))}
    </div>
  );
}
