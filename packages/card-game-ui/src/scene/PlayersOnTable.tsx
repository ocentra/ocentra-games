import React, { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import PlayerUI from './PlayerUI';
import './PlayersOnTable.css';
import { tableLayoutStore } from '@ocentra/game-layout-domain/tableLayoutStore';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import type { TableLayoutState } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';

interface PlayersOnTableProps {
  editableSeats?: boolean;
  showLocalSeat?: boolean;
  onSeatsChange?: (seats: SeatLayout[]) => void;
}

const PlayersOnTable: React.FC<PlayersOnTableProps> = ({
  editableSeats = false,
  showLocalSeat = false,
  onSeatsChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragSeatIdRef = useRef<number | null>(null);
  const layoutState = useSyncExternalStore<TableLayoutState>(
    tableLayoutStore.subscribe,
    tableLayoutStore.getState,
    tableLayoutStore.getState
  );

  const seats = layoutState.seats ?? [];
  const selectedSeatId = layoutState.selectedSeatId ?? null;
  const playerUiDefaults = layoutState.asset?.layout.playerUiDefaults ?? {};
  const visibleSeats = useMemo(
    () => seats.filter((seat: SeatLayout) => showLocalSeat || seat.id !== 0),
    [seats, showLocalSeat],
  );

  const handleSeatSelect = useCallback((seatId: number | null) => {
    tableLayoutStore.setSelectedSeat(seatId);
  }, []);

  const updateSeatPositionFromPointer = useCallback((clientX: number, clientY: number) => {
    if (!editableSeats || dragSeatIdRef.current === null || !containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const nextX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const nextY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const nextSeats = seats.map((seat) => (
      seat.id === dragSeatIdRef.current
        ? {
            ...seat,
            position: {
              x: Math.round(nextX * 10000) / 10000,
              y: Math.round(nextY * 10000) / 10000,
            },
          }
        : seat
    ));

    tableLayoutStore.setSeats(nextSeats);
    onSeatsChange?.(nextSeats);
  }, [editableSeats, onSeatsChange, seats]);

  useEffect(() => {
    if (!editableSeats) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      updateSeatPositionFromPointer(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      dragSeatIdRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [editableSeats, updateSeatPositionFromPointer]);

  const handleSeatDragStart = useCallback((seatId: number, clientX: number, clientY: number) => {
    if (!editableSeats) {
      return;
    }
    dragSeatIdRef.current = seatId;
    tableLayoutStore.setSelectedSeat(seatId);
    updateSeatPositionFromPointer(clientX, clientY);
  }, [editableSeats, updateSeatPositionFromPointer]);

  return (
    <div className={editableSeats ? 'players-on-table players-on-table--interactive' : 'players-on-table'} ref={containerRef}>
      {visibleSeats.map((seat: SeatLayout, index: number) => (
          <PlayerSeatContainer
            key={seat.id ?? `seat-${index}`}
            seat={seat}
            selected={seat.id === selectedSeatId}
            onSelect={handleSeatSelect}
            onDragStart={handleSeatDragStart}
            playerUiDefaults={playerUiDefaults}
            editable={editableSeats}
            isLocalSeat={seat.id === 0}
          />
        ))}
    </div>
  );
};

interface PlayerSeatContainerProps {
  seat: SeatLayout;
  onSelect: (seatId: number) => void;
  onDragStart: (seatId: number, clientX: number, clientY: number) => void;
  selected: boolean;
  playerUiDefaults: Record<string, unknown>;
  editable: boolean;
  isLocalSeat: boolean;
}

const PlayerSeatContainer: React.FC<PlayerSeatContainerProps> = ({
  seat,
  onSelect,
  onDragStart,
  selected,
  playerUiDefaults,
  editable,
  isLocalSeat,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    node.style.setProperty('--seat-left', `${(seat.position?.x ?? 0.5) * 100}%`);
    node.style.setProperty('--seat-top', `${(seat.position?.y ?? 0.5) * 100}%`);
    node.style.setProperty('--seat-rotation', `${seat.rotation ?? 0}deg`);
    node.style.setProperty('--seat-scale', `${seat.scale ?? 1}`);
  }, [seat.position?.x, seat.position?.y, seat.rotation, seat.scale]);

  const handleClick = useCallback(() => {
    onSelect(seat.id);
  }, [onSelect, seat.id]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!editable) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onDragStart(seat.id, event.clientX, event.clientY);
  }, [editable, onDragStart, seat.id]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (editable && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [editable]);

  const className = [
    'player-seat',
    selected ? 'player-seat--selected' : '',
    editable ? 'player-seat--editable' : '',
    isLocalSeat ? 'player-seat--local' : '',
  ].filter(Boolean).join(' ');
  return (
    <div
      ref={ref}
      className={className}
      data-seat-id={seat.id}
      aria-hidden="true"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {editable ? <div className="player-seat__editor-frame" /> : null}
      <PlayerUI {...playerUiDefaults} {...(seat.playerOverrides ?? {})} />
      {editable ? (
        <div className="player-seat__handle-wrap">
          <div className="player-seat__handle player-seat__handle--label">{seat.label ?? `P${seat.id + 1}`}</div>
          <div className="player-seat__handle player-seat__handle--drag">Drag</div>
        </div>
      ) : null}
    </div>
  );
};

export default PlayersOnTable;
