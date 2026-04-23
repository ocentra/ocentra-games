import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import PlayerUI from './PlayerUI';
import './PlayersOnTable.css';
import { tableLayoutStore } from '@ocentra/game-layout-domain/tableLayoutStore';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import type { TableLayoutState } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import { IsolationComponentType } from '@ocentra/game-layout-domain/isolation-types';

interface PlayersOnTableProps {
  editableSeats?: boolean;
  showLocalSeat?: boolean;
  onSeatsChange?: (seats: SeatLayout[]) => void;
  onIsolate?: (type: IsolationComponentType, label: string, config: unknown) => void;
}

interface AlignmentGuides {
  x: number | null;
  y: number | null;
}

const AXIS_SNAP_DISTANCE = 0.0125;

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

const PlayersOnTable: React.FC<PlayersOnTableProps> = ({
  editableSeats = false,
  showLocalSeat = false,
  onSeatsChange,
  onIsolate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragSeatIdRef = useRef<number | null>(null);
  const [dragSeatId, setDragSeatId] = useState<number | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuides>({ x: null, y: null });
  const layoutState = useSyncExternalStore<TableLayoutState>(
    tableLayoutStore.subscribe,
    tableLayoutStore.getState,
    tableLayoutStore.getState
  );

  const seats = useMemo(() => layoutState.seats ?? [], [layoutState.seats]);
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

    const rawX = clampUnit((clientX - rect.left) / rect.width);
    const rawY = clampUnit((clientY - rect.top) / rect.height);
    const otherSeats = seats.filter((seat) => seat.id !== dragSeatIdRef.current);
    const snapXTarget = otherSeats.reduce<SeatLayout | null>((closest, seat) => {
      if (Math.abs(seat.position.x - rawX) > AXIS_SNAP_DISTANCE) {
        return closest;
      }
      if (!closest) {
        return seat;
      }
      return Math.abs(seat.position.x - rawX) < Math.abs((closest.position?.x ?? 0) - rawX) ? seat : closest;
    }, null);
    const snapYTarget = otherSeats.reduce<SeatLayout | null>((closest, seat) => {
      if (Math.abs(seat.position.y - rawY) > AXIS_SNAP_DISTANCE) {
        return closest;
      }
      if (!closest) {
        return seat;
      }
      return Math.abs(seat.position.y - rawY) < Math.abs((closest.position?.y ?? 0) - rawY) ? seat : closest;
    }, null);
    const nextX = snapXTarget ? snapXTarget.position.x : rawX;
    const nextY = snapYTarget ? snapYTarget.position.y : rawY;

    setAlignmentGuides({
      x: snapXTarget ? nextX : null,
      y: snapYTarget ? nextY : null,
    });

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
      setDragSeatId(null);
      setAlignmentGuides({ x: null, y: null });
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
    setDragSeatId(seatId);
    tableLayoutStore.setSelectedSeat(seatId);
    updateSeatPositionFromPointer(clientX, clientY);
  }, [editableSeats, updateSeatPositionFromPointer]);

  const handlePositionChange = useCallback((seatId: number, x: number, y: number) => {
    const nextSeats = seats.map((seat) =>
      seat.id === seatId
        ? { ...seat, position: { x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 } }
        : seat
    );
    tableLayoutStore.setSeats(nextSeats);
    onSeatsChange?.(nextSeats);
  }, [onSeatsChange, seats]);

  return (
    <div className={editableSeats ? 'players-on-table players-on-table--interactive' : 'players-on-table'} ref={containerRef}>
      {editableSeats && alignmentGuides.x !== null ? (
        <div
          className="players-on-table__guide players-on-table__guide--vertical"
          style={{ left: `${alignmentGuides.x * 100}%` }}
        />
      ) : null}
      {editableSeats && alignmentGuides.y !== null ? (
        <div
          className="players-on-table__guide players-on-table__guide--horizontal"
          style={{ top: `${alignmentGuides.y * 100}%` }}
        />
      ) : null}
      {visibleSeats.map((seat: SeatLayout, index: number) => (
        <PlayerSeatContainer
          key={seat.id ?? `seat-${index}`}
          seat={seat}
          selected={seat.id === selectedSeatId}
          dragging={seat.id === dragSeatId}
          onSelect={handleSeatSelect}
          onDragStart={handleSeatDragStart}
          playerUiDefaults={playerUiDefaults}
          editable={editableSeats}
          isLocalSeat={seat.id === 0}
          onIsolate={onIsolate}
          onPositionChange={editableSeats ? handlePositionChange : undefined}
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
  dragging: boolean;
  playerUiDefaults: Record<string, unknown>;
  editable: boolean;
  isLocalSeat: boolean;
  onIsolate?: (type: IsolationComponentType, label: string, config: unknown) => void;
  onPositionChange?: (seatId: number, x: number, y: number) => void;
}

const PlayerSeatContainer: React.FC<PlayerSeatContainerProps> = ({
  seat,
  onSelect,
  onDragStart,
  selected,
  dragging,
  playerUiDefaults,
  editable,
  isLocalSeat,
  onIsolate,
  onPositionChange,
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
    dragging ? 'player-seat--dragging' : '',
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
      <PlayerUI 
        {...playerUiDefaults} 
        {...(seat.playerOverrides ?? {})} 
        onIsolate={onIsolate ? () => onIsolate(IsolationComponentType.PlayerUI, seat.label ?? `Player ${seat.id + 1}`, { ...playerUiDefaults, ...(seat.playerOverrides ?? {}) }) : undefined}
      />
      {editable ? (
        <div className="player-seat__editor-controls">
          <div className="player-seat__handle-wrap">
            <div className="player-seat__handle player-seat__handle--label">{seat.label ?? `P${seat.id + 1}`}</div>
            <div className="player-seat__handle player-seat__handle--drag">Drag</div>
          </div>
          {selected || dragging ? (
            <div className="player-seat__coord-inputs" onPointerDown={(e) => e.stopPropagation()}>
              <label className="player-seat__coord-field">
                <span>X</span>
                <input
                  id={`seat-${seat.id}-x`}
                  type="number"
                  className="player-seat__coord-input"
                  min={0}
                  max={1}
                  step={0.001}
                  value={seat.position.x.toFixed(3)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) onPositionChange?.(seat.id, Math.max(0, Math.min(1, v)), seat.position.y);
                  }}
                />
              </label>
              <label className="player-seat__coord-field">
                <span>Y</span>
                <input
                  id={`seat-${seat.id}-y`}
                  type="number"
                  className="player-seat__coord-input"
                  min={0}
                  max={1}
                  step={0.001}
                  value={seat.position.y.toFixed(3)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) onPositionChange?.(seat.id, seat.position.x, Math.max(0, Math.min(1, v)));
                  }}
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default PlayersOnTable;
